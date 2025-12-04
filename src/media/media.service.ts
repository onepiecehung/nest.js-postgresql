import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, hkdfSync } from 'crypto';
import { Readable } from 'stream';
import { Repository } from 'typeorm';

import { AdvancedPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { MEDIA_CONSTANTS, MediaStatus, MediaType } from 'src/shared/constants';
import { CacheService, R2Service } from 'src/shared/services';

import { CreateMediaDto, MediaQueryDto, UpdateMediaDto } from './dto';
import { Media } from './entities/media.entity';
import {
  ImageScrambleMetadata,
  ImageScramblerConfig,
  ImageScramblerService,
} from './image-scrambler.service';

@Injectable()
export class MediaService extends BaseService<Media> {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly configService: ConfigService,
    private readonly r2Service: R2Service,
    cacheService: CacheService,
    private readonly imageScramblerService: ImageScramblerService,
  ) {
    super(
      new TypeOrmBaseRepository<Media>(mediaRepository),
      {
        entityName: 'Media',
        cache: { enabled: true, ttlSec: 300, prefix: 'media', swrSec: 60 },
        defaultSearchField: 'name',
        relationsWhitelist: {
          user: true,
        },
        selectWhitelist: {
          id: true,
          name: true,
          title: true,
          altText: true,
          mimeType: true,
          extension: true,
          size: true,
          description: true,
          type: true,
          url: true,
          key: true,
          status: true,
          isPublic: true,
          width: true,
          height: true,
          duration: true,
          downloadCount: true,
          viewCount: true,
          metadata: true,
          user: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
      cacheService,
    );
  }

  // Override searchable columns for media-specific search
  protected getSearchableColumns(): (keyof Media)[] {
    return ['name', 'title', 'description', 'altText'];
  }

  /**
   * Sanitize and validate custom folder path from user input
   * Prevents path traversal attacks and ensures path is within allowed boundaries
   * @param customFolder Custom folder path from user
   * @param baseFolder Base folder from config (e.g., 'media')
   * @returns Sanitized folder path
   */
  private sanitizeFolderPath(
    customFolder: string | undefined,
    baseFolder: string,
  ): string {
    if (!customFolder) {
      return baseFolder;
    }

    // Remove leading/trailing slashes and whitespace
    let sanitized = customFolder.trim().replace(/^\/+|\/+$/g, '');

    // Prevent path traversal attacks
    if (
      sanitized.includes('..') ||
      sanitized.includes('//') ||
      sanitized.startsWith('/') ||
      sanitized.includes('\0')
    ) {
      this.logger.warn(
        `Invalid folder path detected: ${customFolder}, using default folder`,
      );
      return baseFolder;
    }

    // Remove any dangerous characters (control characters, special chars)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[<>:"|?*\u0000-\u001f]/g, '');

    // Limit path depth to prevent abuse (max 5 levels deep)
    const depth = sanitized.split('/').length;
    if (depth > 5) {
      this.logger.warn(
        `Folder path too deep: ${customFolder}, using default folder`,
      );
      return baseFolder;
    }

    // Limit total path length (max 200 characters)
    if (sanitized.length > 200) {
      this.logger.warn(
        `Folder path too long: ${customFolder}, using default folder`,
      );
      return baseFolder;
    }

    // Combine base folder with custom folder
    // e.g., 'media' + 'user-uploads' = 'media/user-uploads'
    return sanitized ? `${baseFolder}/${sanitized}` : baseFolder;
  }

  /**
   * Upload multiple media files
   * @param files Array of uploaded files
   * @param userId User ID uploading the files
   * @param customFolder Optional custom folder path (will be sanitized)
   * @returns Array of created media entities
   */
  async uploadMedia(
    files: Array<Express.Multer.File>,
    userId: string,
    customFolder?: string,
  ): Promise<Media[]> {
    try {
      if (!files || files.length === 0) {
        throw new HttpException(
          {
            messageKey: 'media.MEDIA_IS_REQUIRED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Sanitize custom folder path if provided
      const baseFolder =
        this.configService.get<string>('r2.folders.media') || 'media';
      const sanitizedFolder = this.sanitizeFolderPath(customFolder, baseFolder);

      const mediaData: CreateMediaDto[] = [];

      for (const file of files) {
        try {
          const processedFile = await this.processUploadedFile(
            file,
            userId,
            sanitizedFolder,
          );
          mediaData.push(processedFile);
        } catch (error: any) {
          this.logger.error(
            `Failed to process file ${file.originalname}:`,
            error,
          );
          // Continue processing other files even if one fails
        }
      }

      if (mediaData.length === 0) {
        throw new HttpException(
          {
            messageKey: 'media.MEDIA_UPLOAD_FAILED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Use BaseService createMany method
      return await this.createMany(mediaData);
    } catch (error: any) {
      this.logger.error('Upload media failed:', error);
      throw error;
    }
  }

  /**
   * Process a single uploaded file
   * @param file Uploaded file
   * @param userId User ID uploading the file
   * @param folder Custom folder path (already sanitized)
   * @returns CreateMediaDto for creating media entity
   */
  private async processUploadedFile(
    file: Express.Multer.File,
    userId: string,
    folder?: string,
  ): Promise<CreateMediaDto> {
    // Validate file size
    if (file.size > MEDIA_CONSTANTS.SIZE_LIMITS.MAX) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_SIZE_EXCEEDED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Determine media type from MIME type
    const mediaType = this.determineMediaType(file.mimetype);

    // Generate unique filename
    const extension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}.${extension}`;

    // Check if scrambler applies (only for images)
    const isImage = mediaType === MEDIA_CONSTANTS.TYPES.IMAGE;
    let uploadBuffer = file.buffer;
    let width: number | undefined;
    let height: number | undefined;
    let imageScramblerMetadata: ImageScrambleMetadata | undefined;

    try {
      const scrambleResult = isImage
        ? await this.imageScramblerService.scrambleIfNeeded(
            file.buffer,
            file.mimetype,
          )
        : null;
      if (scrambleResult) {
        uploadBuffer = scrambleResult.buffer;
        width = scrambleResult.width;
        height = scrambleResult.height;
        imageScramblerMetadata = scrambleResult.metadata;
      }
    } catch (error) {
      this.logger.error(
        `Failed to scramble image ${file.originalname}:`,
        error,
      );
      // Fallback to original buffer but keep logging
    }

    // Upload file to R2 (scrambled buffer if scrambling was applied)
    const metadata = {
      originalName: file.originalname,
      mediaType: mediaType,
      uploadedBy: userId,
      scrambled: imageScramblerMetadata ? 'true' : 'false',
      scrambleVersion: imageScramblerMetadata
        ? String(imageScramblerMetadata.version)
        : '1',
    };
    this.logger.log('metadata', metadata);
    // Use custom folder if provided, otherwise use default from config
    const uploadFolder = folder || this.configService.get('r2.folders.media');
    const uploadResult = await this.r2Service.uploadFile(uploadBuffer, {
      folder: uploadFolder,
      filename: fileName,
      contentType: file.mimetype,
      metadata,
    });
    Object.assign(metadata, { ...imageScramblerMetadata });

    // Return CreateMediaDto for BaseService to handle
    return {
      name: file.originalname,
      mimeType: file.mimetype,
      extension: extension,
      size: file.size,
      type: mediaType,
      status: 'inactive' as MediaStatus,
      isPublic: false,
      // R2 specific fields
      path: uploadResult.key,
      url: uploadResult.url,
      originalName: file.originalname,
      key: uploadResult.key,
      storageProvider: 'r2',
      userId: userId,
      width,
      height,
      metadata: JSON.stringify(metadata),
    } as CreateMediaDto;
  }

  /**
   * Determine media type from MIME type
   * @param mimeType MIME type string
   * @returns Media type enum value
   */
  private determineMediaType(mimeType: string): MediaType {
    for (const [typeKey, mimeTypes] of Object.entries(
      MEDIA_CONSTANTS.ALLOWED_MIME_TYPES,
    )) {
      if ((mimeTypes as readonly string[]).includes(mimeType)) {
        // Convert type key (e.g., "IMAGE") to type value (e.g., "image")
        return MEDIA_CONSTANTS.TYPES[
          typeKey as keyof typeof MEDIA_CONSTANTS.TYPES
        ] as MediaType;
      }
    }
    return MEDIA_CONSTANTS.TYPES.OTHER as MediaType;
  }

  /**
   * Get media with pagination and filters using BaseService
   * @param query Query parameters
   * @returns Paginated media results
   */
  async getMedia(query: MediaQueryDto): Promise<IPagination<Media>> {
    const { minSize, maxSize } = query;

    // Build extra filters for BaseService
    const extraFilter: Record<string, unknown> = {};

    if (minSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $gte: minSize,
      };
    }

    if (maxSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $lte: maxSize,
      };
    }

    // Use BaseService listOffset method
    return await this.listOffset(query, extraFilter);
  }

  /**
   * Get media with cursor pagination using BaseService
   * @param query Query parameters with cursor pagination
   * @returns Cursor paginated media results
   */
  async getMediaCursor(
    query: MediaQueryDto & { cursor?: string },
  ): Promise<IPaginationCursor<Media>> {
    const { type, isPublic, minSize, maxSize } = query;

    // Build extra filters for BaseService
    const extraFilter: Record<string, unknown> = {};

    if (type !== undefined) {
      extraFilter.type = type;
    }

    if (isPublic !== undefined) {
      extraFilter.isPublic = isPublic;
    }

    if (minSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $gte: minSize,
      };
    }

    if (maxSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $lte: maxSize,
      };
    }

    // Use BaseService listCursor method
    return await this.listCursor(query, extraFilter);
  }

  /**
   * Get media by ID using BaseService
   * @param id Media ID
   * @returns Media entity
   */
  async getMediaById(id: string): Promise<Media> {
    return await this.findById(id, { relations: ['user'] });
  }

  /**
   * Update media metadata using BaseService
   * @param id Media ID
   * @param updateMediaDto Update data
   * @returns Updated media entity
   */
  async updateMedia(
    id: string,
    updateMediaDto: UpdateMediaDto,
  ): Promise<Media> {
    return await this.update(id, updateMediaDto);
  }

  /**
   * Activate media
   * @param id Media ID
   * @returns Activated media entity
   */
  async activateMedia(id: string): Promise<Media> {
    const media = await this.findById(id);

    if (media.status === 'active') {
      return media;
    }

    return await this.update(id, { status: 'active' as MediaStatus });
  }

  /**
   * Deactivate media
   * @param id Media ID
   * @returns Deactivated media entity
   */
  async deactivateMedia(id: string): Promise<Media> {
    const media = await this.findById(id);

    if (media.status === 'inactive') {
      return media;
    }

    return await this.update(id, { status: 'inactive' as MediaStatus });
  }

  /**
   * Find media by user ID
   * @param userId User ID
   * @param pagination Pagination options
   * @returns Paginated media results for user
   */
  async getMediaByUserId(
    userId: string,
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { userId });
  }

  /**
   * Find media by type
   * @param type Media type
   * @param pagination Pagination options
   * @returns Paginated media results by type
   */
  async getMediaByType(
    type: MediaType,
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { type });
  }

  /**
   * Find public media
   * @param pagination Pagination options
   * @returns Paginated public media results
   */
  async getPublicMedia(
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { isPublic: true });
  }

  /**
   * Increment view count for media
   * @param id Media ID
   * @returns Updated media entity
   */
  async incrementViewCount(id: string): Promise<Media> {
    const media = await this.findById(id);
    return await this.update(id, { viewCount: (media.viewCount || 0) + 1 });
  }

  /**
   * Increment download count for media
   * @param id Media ID
   * @returns Updated media entity
   */
  async incrementDownloadCount(id: string): Promise<Media> {
    const media = await this.findById(id);
    return await this.update(id, {
      downloadCount: (media.downloadCount || 0) + 1,
    });
  }

  /**
   * Find media by status
   * @param status Media status
   * @param pagination Pagination options
   * @returns Paginated media results by status
   */
  async getMediaByStatus(
    status: MediaStatus,
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { status });
  }

  /**
   * Generate presigned URL for media upload
   * @param filename Original filename
   * @param contentType MIME type
   * @param contentLength File size
   * @returns Presigned URL and media key
   */
  async generatePresignedUploadUrl(
    filename: string,
    contentType: string,
    contentLength?: number,
  ): Promise<{ presignedUrl: string; key: string; publicUrl: string }> {
    const extension = filename.split('.').pop();
    const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}.${extension}`;
    const key = `${this.configService.get('r2.folders.media')}/${fileName}`;

    const presignedUrl = await this.r2Service.generatePresignedUploadUrl(key, {
      contentType,
      contentLength,
    });

    const publicUrl = this.r2Service.generatePublicUrl(key);

    return {
      presignedUrl,
      key,
      publicUrl,
    };
  }

  /**
   * Generate presigned URL for media download
   * @param id Media ID
   * @param expiresIn Expiry time in seconds
   * @returns Presigned URL
   */
  async generatePresignedDownloadUrl(
    id: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const media = await this.findById(id);
    return await this.r2Service.generatePresignedDownloadUrl(
      media.key,
      expiresIn,
    );
  }

  /**
   * Delete media file from R2
   * @param id Media ID
   */
  async deleteMediaFile(id: string): Promise<void> {
    const media = await this.findById(id);

    if (media.key) {
      await this.r2Service.deleteFile(media.key);

      // Delete thumbnail and preview if they exist
      if (media.type === 'image') {
        const thumbnailKey = this.r2Service.generateThumbnailKey(media.key);
        const previewKey = this.r2Service.generatePreviewKey(media.key);

        try {
          await Promise.all([
            this.r2Service.deleteFile(thumbnailKey),
            this.r2Service.deleteFile(previewKey),
          ]);
        } catch (error) {
          this.logger.warn(
            `Failed to delete thumbnail/preview for media ${id}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Get media file stream
   * @param id Media ID
   * @returns File stream
   */
  async getMediaFileStream(id: string): Promise<Readable> {
    const media = await this.findById(id);
    return await this.r2Service.downloadFile(media.key);
  }

  /**
   * Check if media file exists in R2
   * @param id Media ID
   * @returns True if file exists
   */
  async checkMediaFileExists(id: string): Promise<boolean> {
    const media = await this.findById(id);
    return await this.r2Service.fileExists(media.key);
  }

  /**
   * Get media file metadata from R2
   * @param id Media ID
   * @returns File metadata
   */
  async getMediaFileMetadata(id: string): Promise<any> {
    const media = await this.findById(id);
    return await this.r2Service.getFileMetadata(media.key);
  }

  /**
   * Override deleteMedia to also delete from R2
   * @param id Media ID
   */
  async deleteMedia(id: string): Promise<void> {
    // Delete from R2 first
    await this.deleteMediaFile(id);

    // Then soft delete from database
    await this.update(id, { status: 'deleted' as MediaStatus });
  }

  /**
   * Get scramble key (permutation seed) and tile config for unscrambling
   * @param id Media ID
   * @returns Permutation seed and tile configuration
   */
  async getScrambleKey(id: string): Promise<{
    permutationSeed: string;
    tileRows: number;
    tileCols: number;
    version: number;
  }> {
    const media = await this.findOne({ id });
    if (!media) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    // Only make sense for image type
    if (media.type !== MEDIA_CONSTANTS.TYPES.IMAGE) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_NOT_IMAGE',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!media.metadata) {
      throw new HttpException(
        {
          messageKey: 'media.SCRAMBLER_METADATA_MISSING',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let parsed: ImageScrambleMetadata | undefined;
    try {
      parsed = JSON.parse(media.metadata) as ImageScrambleMetadata;
    } catch (error) {
      this.logger.error('Failed to parse media.metadata JSON:', error);
      throw new HttpException(
        {
          messageKey: 'media.SCRAMBLER_METADATA_INVALID',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const scramblerMeta = parsed;
    if (
      !scramblerMeta ||
      !scramblerMeta.enabled ||
      !scramblerMeta.salt ||
      !scramblerMeta.tileRows ||
      !scramblerMeta.tileCols
    ) {
      throw new HttpException(
        {
          messageKey: 'media.SCRAMBLER_NOT_ENABLED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const salt = Buffer.from(scramblerMeta.salt, 'base64');
    const scramblerConfig =
      this.configService.get<ImageScramblerConfig>('app.imageScrambler');

    if (!scramblerConfig?.enabled) {
      throw new HttpException(
        {
          messageKey: 'media.SCRAMBLER_DISABLED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const masterKey = Buffer.from(scramblerConfig.masterKey, 'utf-8');
    // Use context string from config (must match the one used during scrambling)
    const contextString = scramblerConfig.contextString;
    const imageKey = Buffer.from(
      hkdfSync('sha256', masterKey, salt, contextString, 32),
    );

    const permSeed = createHmac('sha256', imageKey)
      .update('perm-seed')
      .digest('base64url');

    return {
      permutationSeed: permSeed,
      tileRows: scramblerMeta.tileRows,
      tileCols: scramblerMeta.tileCols,
      version: scramblerMeta.version ?? scramblerConfig.version,
    };
  }
}
