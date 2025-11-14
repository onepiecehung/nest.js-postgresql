import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Readable } from 'stream';
import { Repository } from 'typeorm';

import { AdvancedPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { MEDIA_CONSTANTS, MediaStatus, MediaType } from 'src/shared/constants';
import { CacheService, R2Service } from 'src/shared/services';
import { MediaQueryDto, UpdateMediaDto } from './dto';
import { Media } from './entities/media.entity';
import {
  ImageScrambleMetadata,
  ImageScramblerConfig,
  ImageScramblerService,
} from './image-scrambler.service';
import { MediaService } from './media.service';

describe('MediaService', () => {
  let service: MediaService;
  let mediaRepository: Repository<Media>;
  let configService: ConfigService;
  let r2Service: R2Service;
  let cacheService: CacheService;
  let imageScramblerService: ImageScramblerService;

  // Mock data
  const mockUser = {
    id: '1234567890123456789',
    uuid: 'test-user-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    dob: new Date('1990-01-01'),
    phoneNumber: '+1234567890',
    password: 'hashedpassword',
    oauthProvider: null,
    oauthId: null,
    firebaseUid: 'firebase-uid-123',
    photoUrl: 'https://example.com/photo.jpg',
    authMethod: 'email_password',
    isEmailVerified: true,
    isPhoneVerified: false,
    avatarId: null,
    avatar: null,
    ownedOrganizations: [],
    organizationMemberships: [],
    status: 'active',
    role: 'user',
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
  } as any;

  // Helper function to create mock Media objects
  const createMockMedia = (overrides: Partial<Media> = {}): Media => {
    const baseMedia = {
      id: '1234567890123456789',
      uuid: 'test-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
      status: 'active' as MediaStatus,
      name: 'test-image.jpg',
      title: 'Test Image',
      altText: 'Test image alt text',
      path: 'media/test-image.jpg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      size: 1024000,
      description: 'Test image description',
      type: 'image' as MediaType,
      url: 'https://example.com/media/test-image.jpg',
      key: 'media/test-image.jpg',
      originalName: 'test-image.jpg',
      thumbnailUrl: 'https://example.com/thumbnails/test-image.jpg',
      previewUrl: 'https://example.com/previews/test-image.jpg',
      userId: '1234567890123456789',
      user: mockUser,
      metadata: '{}',
      storageProvider: 'r2',
      width: 1920,
      height: 1080,
      duration: 0,
      downloadCount: 0,
      viewCount: 0,
      isPublic: false,
      tags: '["test", "image"]',
      generateId: jest.fn(),
      toJSON: jest.fn().mockReturnValue({}),
      isDeleted: jest.fn().mockReturnValue(false),
      getAge: jest.fn().mockReturnValue(1000000),
      getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
      getDimensions: jest.fn().mockReturnValue('1920x1080'),
      getFormattedSize: jest.fn().mockReturnValue('1.0 MB'),
      isImage: jest.fn().mockReturnValue(true),
      isVideo: jest.fn().mockReturnValue(false),
      isAudio: jest.fn().mockReturnValue(false),
      isDocument: jest.fn().mockReturnValue(false),
    };

    return { ...baseMedia, ...overrides } as Media;
  };

  const mockMedia: Media = createMockMedia();

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000,
    buffer: Buffer.from('test file content'),
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  };

  const mockUploadResult = {
    key: 'media/1234567890_123456789.jpg',
    url: 'https://example.com/media/1234567890_123456789.jpg',
    etag: 'test-etag',
  };

  // Mock repository
  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: {
      columns: [
        { propertyName: 'deletedAt' },
        { propertyName: 'id' },
        { propertyName: 'name' },
        { propertyName: 'status' },
      ],
    },
  };

  // Mock config service
  const mockScramblerConfig: ImageScramblerConfig = {
    enabled: true,
    masterKey: 'test-master-key',
    tileRows: 24,
    tileCols: 12,
    version: 1,
    contextString: 'jai-image-scramble-v1',
    rotationDurationSeconds: 0,
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config = {
        'r2.folders.media': 'media',
        'app.imageScrambler': mockScramblerConfig,
      };
      return config[key];
    }),
  };

  // Mock R2 service
  const mockR2Service = {
    uploadFile: jest.fn(),
    generatePresignedUploadUrl: jest.fn(),
    generatePresignedDownloadUrl: jest.fn(),
    generatePublicUrl: jest.fn(),
    deleteFile: jest.fn(),
    downloadFile: jest.fn(),
    fileExists: jest.fn(),
    getFileMetadata: jest.fn(),
    generateThumbnailKey: jest.fn(),
    generatePreviewKey: jest.fn(),
  };

  // Mock cache service
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
    exists: jest.fn(),
    findKeysByPattern: jest.fn(),
    countKeysByPattern: jest.fn(),
    setLock: jest.fn(),
    releaseLock: jest.fn(),
    atomicIncrementWithLimit: jest.fn(),
    compareAndSwap: jest.fn(),
    atomicMultiOperation: jest.fn(),
    remember: jest.fn(),
    getOrSetWithPrefix: jest.fn(),
  };

  // Mock image scrambler service
  const mockImageScramblerService = {
    scrambleIfNeeded: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: getRepositoryToken(Media),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: R2Service,
          useValue: mockR2Service,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ImageScramblerService,
          useValue: mockImageScramblerService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    mediaRepository = module.get<Repository<Media>>(getRepositoryToken(Media));
    configService = module.get<ConfigService>(ConfigService);
    r2Service = module.get<R2Service>(R2Service);
    cacheService = module.get<CacheService>(CacheService);
    imageScramblerService = module.get<ImageScramblerService>(
      ImageScramblerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadMedia', () => {
    it('should successfully upload multiple media files', async () => {
      // Arrange
      const files = [mockFile, { ...mockFile, originalname: 'test2.jpg' }];
      const userId = '1234567890123456789';

      mockR2Service.uploadFile.mockResolvedValue(mockUploadResult);
      jest
        .spyOn(service, 'createMany')
        .mockResolvedValue([createMockMedia(), createMockMedia()]);

      // Act
      const result = await service.uploadMedia(files, userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockR2Service.uploadFile).toHaveBeenCalledTimes(2);
      expect(service.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'test-image.jpg',
            mimeType: 'image/jpeg',
            type: 'image',
            userId: userId,
          }),
        ]),
      );
    });

    it('should throw error when no files provided', async () => {
      // Arrange
      const files = [];
      const userId = '1234567890123456789';

      // Act & Assert
      await expect(service.uploadMedia(files, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.MEDIA_IS_REQUIRED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when file size exceeds limit', async () => {
      // Arrange
      const largeFile = {
        ...mockFile,
        size: MEDIA_CONSTANTS.SIZE_LIMITS.MAX + 1,
      };
      const files = [largeFile];
      const userId = '1234567890123456789';

      // Act & Assert
      await expect(service.uploadMedia(files, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.MEDIA_SIZE_EXCEEDED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should continue processing other files when one fails', async () => {
      // Arrange
      const validFile = mockFile;
      const invalidFile = {
        ...mockFile,
        size: MEDIA_CONSTANTS.SIZE_LIMITS.MAX + 1,
      };
      const files = [validFile, invalidFile];
      const userId = '1234567890123456789';

      mockR2Service.uploadFile.mockResolvedValue(mockUploadResult);
      jest.spyOn(service, 'createMany').mockResolvedValue([createMockMedia()]);

      // Act
      const result = await service.uploadMedia(files, userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockR2Service.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should throw error when all files fail to process', async () => {
      // Arrange
      const invalidFile = {
        ...mockFile,
        size: MEDIA_CONSTANTS.SIZE_LIMITS.MAX + 1,
      };
      const files = [invalidFile];
      const userId = '1234567890123456789';

      // Act & Assert
      await expect(service.uploadMedia(files, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.MEDIA_UPLOAD_FAILED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('processUploadedFile', () => {
    it('should process uploaded file correctly', async () => {
      // Arrange
      const userId = '1234567890123456789';
      mockR2Service.uploadFile.mockResolvedValue(mockUploadResult);

      // Act
      const result = await (service as any).processUploadedFile(
        mockFile,
        userId,
      );

      // Assert
      expect(result).toEqual({
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        size: 1024000,
        type: 'image',
        status: 'inactive',
        isPublic: false,
        path: mockUploadResult.key,
        url: mockUploadResult.url,
        originalName: 'test-image.jpg',
        key: mockUploadResult.key,
        storageProvider: 'r2',
        userId: userId,
        width: undefined,
        height: undefined,
        metadata: expect.stringContaining('"originalName":"test-image.jpg"'),
      });
      expect(mockR2Service.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.objectContaining({
          folder: 'media',
          filename: expect.stringMatching(/^\d+_\d+\.jpg$/),
          contentType: 'image/jpeg',
          metadata: expect.objectContaining({
            originalName: 'test-image.jpg',
            mediaType: 'image',
            uploadedBy: userId,
          }),
        }),
      );
    });

    it('should determine media type correctly for different MIME types', async () => {
      // Arrange
      const testCases = [
        { mimeType: 'image/jpeg', expectedType: 'image' },
        { mimeType: 'video/mp4', expectedType: 'video' },
        { mimeType: 'audio/mp3', expectedType: 'audio' },
        { mimeType: 'application/pdf', expectedType: 'document' },
        { mimeType: 'unknown/type', expectedType: 'other' },
      ];

      mockR2Service.uploadFile.mockResolvedValue(mockUploadResult);

      for (const testCase of testCases) {
        const file = { ...mockFile, mimetype: testCase.mimeType };

        // Act
        const result = await (service as any).processUploadedFile(
          file,
          '1234567890123456789',
        );

        // Assert
        expect(result.type).toBe(testCase.expectedType);
      }
    });
  });

  describe('getMedia', () => {
    it('should get media with pagination and filters', async () => {
      // Arrange
      const query: MediaQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        minSize: 1000,
        maxSize: 5000000,
      };
      const mockPagination: IPagination<Media> = {
        result: [mockMedia],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getMedia(query);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listOffset).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          size: {
            $gte: 1000,
            $lte: 5000000,
          },
        }),
      );
    });

    it('should handle query without size filters', async () => {
      // Arrange
      const query: MediaQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };
      const mockPagination: IPagination<Media> = {
        result: [mockMedia],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getMedia(query);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listOffset).toHaveBeenCalledWith(query, {});
    });
  });

  describe('getMediaCursor', () => {
    it('should get media with cursor pagination and filters', async () => {
      // Arrange
      const query: MediaQueryDto & { cursor?: string } = {
        page: 1,
        limit: 20,
        cursor: 'test-cursor',
        sortBy: 'createdAt',
        order: 'DESC',
        type: 'image',
        isPublic: true,
        minSize: 1000,
        maxSize: 5000000,
      };
      const mockPagination: IPaginationCursor<Media> = {
        result: [mockMedia],
        metaData: {
          nextCursor: 'next-cursor',
          prevCursor: null,
          take: 20,
          sortBy: 'createdAt',
          order: 'DESC',
        },
      };

      jest.spyOn(service, 'listCursor').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getMediaCursor(query);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listCursor).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          type: 'image',
          isPublic: true,
          size: {
            $gte: 1000,
            $lte: 5000000,
          },
        }),
      );
    });
  });

  describe('getMediaById', () => {
    it('should get media by ID with user relation', async () => {
      // Arrange
      const id = '1234567890123456789';
      jest.spyOn(service, 'findById').mockResolvedValue(mockMedia);

      // Act
      const result = await service.getMediaById(id);

      // Assert
      expect(result).toEqual(mockMedia);
      expect(service.findById).toHaveBeenCalledWith(id, {
        relations: ['user'],
      });
    });
  });

  describe('updateMedia', () => {
    it('should update media metadata', async () => {
      // Arrange
      const id = '1234567890123456789';
      const updateDto: UpdateMediaDto = {
        title: 'Updated Title',
        description: 'Updated description',
      };
      const updatedMedia = createMockMedia(updateDto);

      jest.spyOn(service, 'update').mockResolvedValue(updatedMedia);

      // Act
      const result = await service.updateMedia(id, updateDto);

      // Assert
      expect(result).toEqual(updatedMedia);
      expect(service.update).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('activateMedia', () => {
    it('should activate inactive media', async () => {
      // Arrange
      const id = '1234567890123456789';
      const inactiveMedia = createMockMedia({
        status: 'inactive' as MediaStatus,
      });
      const activatedMedia = createMockMedia({
        status: 'active' as MediaStatus,
      });

      jest.spyOn(service, 'findById').mockResolvedValue(inactiveMedia);
      jest.spyOn(service, 'update').mockResolvedValue(activatedMedia);

      // Act
      const result = await service.activateMedia(id);

      // Assert
      expect(result).toEqual(activatedMedia);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, { status: 'active' });
    });

    it('should return media if already active', async () => {
      // Arrange
      const id = '1234567890123456789';
      const activeMedia = createMockMedia({ status: 'active' as MediaStatus });

      jest.spyOn(service, 'findById').mockResolvedValue(activeMedia);

      // Act
      const result = await service.activateMedia(id);

      // Assert
      expect(result).toEqual(activeMedia);
      expect(service.findById).toHaveBeenCalledWith(id);
      // service.update should not be called since media is already active
    });
  });

  describe('deactivateMedia', () => {
    it('should deactivate active media', async () => {
      // Arrange
      const id = '1234567890123456789';
      const activeMedia = createMockMedia({ status: 'active' as MediaStatus });
      const deactivatedMedia = createMockMedia({
        status: 'inactive' as MediaStatus,
      });

      jest.spyOn(service, 'findById').mockResolvedValue(activeMedia);
      jest.spyOn(service, 'update').mockResolvedValue(deactivatedMedia);

      // Act
      const result = await service.deactivateMedia(id);

      // Assert
      expect(result).toEqual(deactivatedMedia);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, { status: 'inactive' });
    });

    it('should return media if already inactive', async () => {
      // Arrange
      const id = '1234567890123456789';
      const inactiveMedia = createMockMedia({
        status: 'inactive' as MediaStatus,
      });

      jest.spyOn(service, 'findById').mockResolvedValue(inactiveMedia);

      // Act
      const result = await service.deactivateMedia(id);

      // Assert
      expect(result).toEqual(inactiveMedia);
      expect(service.findById).toHaveBeenCalledWith(id);
      // service.update should not be called since media is already inactive
    });
  });

  describe('getMediaByUserId', () => {
    it('should get media by user ID with pagination', async () => {
      // Arrange
      const userId = '1234567890123456789';
      const pagination: AdvancedPaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };
      const mockPagination: IPagination<Media> = {
        result: [mockMedia],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getMediaByUserId(userId, pagination);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listOffset).toHaveBeenCalledWith(pagination, { userId });
    });
  });

  describe('getMediaByType', () => {
    it('should get media by type with pagination', async () => {
      // Arrange
      const type: MediaType = 'image';
      const pagination: AdvancedPaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };
      const mockPagination: IPagination<Media> = {
        result: [mockMedia],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getMediaByType(type, pagination);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listOffset).toHaveBeenCalledWith(pagination, { type });
    });
  });

  describe('getPublicMedia', () => {
    it('should get public media with pagination', async () => {
      // Arrange
      const pagination: AdvancedPaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };
      const mockPagination: IPagination<Media> = {
        result: [mockMedia],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getPublicMedia(pagination);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listOffset).toHaveBeenCalledWith(pagination, {
        isPublic: true,
      });
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mediaWithViews = createMockMedia({ viewCount: 5 });
      const updatedMedia = createMockMedia({ viewCount: 6 });

      jest.spyOn(service, 'findById').mockResolvedValue(mediaWithViews);
      jest.spyOn(service, 'update').mockResolvedValue(updatedMedia);

      // Act
      const result = await service.incrementViewCount(id);

      // Assert
      expect(result).toEqual(updatedMedia);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, { viewCount: 6 });
    });

    it('should handle media with no existing view count', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mediaWithoutViews = createMockMedia({ viewCount: 0 });
      const updatedMedia = createMockMedia({ viewCount: 1 });

      jest.spyOn(service, 'findById').mockResolvedValue(mediaWithoutViews);
      jest.spyOn(service, 'update').mockResolvedValue(updatedMedia);

      // Act
      const result = await service.incrementViewCount(id);

      // Assert
      expect(result).toEqual(updatedMedia);
      expect(service.update).toHaveBeenCalledWith(id, { viewCount: 1 });
    });
  });

  describe('incrementDownloadCount', () => {
    it('should increment download count', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mediaWithDownloads = createMockMedia({ downloadCount: 3 });
      const updatedMedia = createMockMedia({ downloadCount: 4 });

      jest.spyOn(service, 'findById').mockResolvedValue(mediaWithDownloads);
      jest.spyOn(service, 'update').mockResolvedValue(updatedMedia);

      // Act
      const result = await service.incrementDownloadCount(id);

      // Assert
      expect(result).toEqual(updatedMedia);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, { downloadCount: 4 });
    });

    it('should handle media with no existing download count', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mediaWithoutDownloads = createMockMedia({ downloadCount: 0 });
      const updatedMedia = createMockMedia({ downloadCount: 1 });

      jest.spyOn(service, 'findById').mockResolvedValue(mediaWithoutDownloads);
      jest.spyOn(service, 'update').mockResolvedValue(updatedMedia);

      // Act
      const result = await service.incrementDownloadCount(id);

      // Assert
      expect(result).toEqual(updatedMedia);
      expect(service.update).toHaveBeenCalledWith(id, { downloadCount: 1 });
    });
  });

  describe('getMediaByStatus', () => {
    it('should get media by status with pagination', async () => {
      // Arrange
      const status: MediaStatus = 'active';
      const pagination: AdvancedPaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };
      const mockPagination: IPagination<Media> = {
        result: [mockMedia],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPagination);

      // Act
      const result = await service.getMediaByStatus(status, pagination);

      // Assert
      expect(result).toEqual(mockPagination);
      expect(service.listOffset).toHaveBeenCalledWith(pagination, { status });
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate presigned upload URL', async () => {
      // Arrange
      const filename = 'test-image.jpg';
      const contentType = 'image/jpeg';
      const contentLength = 1024000;
      const mockPresignedUrl = 'https://example.com/presigned-upload-url';
      const mockPublicUrl = 'https://example.com/public-url';

      mockR2Service.generatePresignedUploadUrl.mockResolvedValue(
        mockPresignedUrl,
      );
      mockR2Service.generatePublicUrl.mockReturnValue(mockPublicUrl);

      // Act
      const result = await service.generatePresignedUploadUrl(
        filename,
        contentType,
        contentLength,
      );

      // Assert
      expect(result).toEqual({
        presignedUrl: mockPresignedUrl,
        key: expect.stringMatching(/^media\/\d+_\d+\.jpg$/),
        publicUrl: mockPublicUrl,
      });
      expect(mockR2Service.generatePresignedUploadUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^media\/\d+_\d+\.jpg$/),
        {
          contentType,
          contentLength,
        },
      );
      expect(mockR2Service.generatePublicUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^media\/\d+_\d+\.jpg$/),
      );
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('should generate presigned download URL', async () => {
      // Arrange
      const id = '1234567890123456789';
      const expiresIn = 3600;
      const mockPresignedUrl = 'https://example.com/presigned-download-url';

      jest.spyOn(service, 'findById').mockResolvedValue(mockMedia);
      mockR2Service.generatePresignedDownloadUrl.mockResolvedValue(
        mockPresignedUrl,
      );

      // Act
      const result = await service.generatePresignedDownloadUrl(id, expiresIn);

      // Assert
      expect(result).toBe(mockPresignedUrl);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.generatePresignedDownloadUrl).toHaveBeenCalledWith(
        mockMedia.key,
        expiresIn,
      );
    });

    it('should use default expiry time when not provided', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mockPresignedUrl = 'https://example.com/presigned-download-url';

      jest.spyOn(service, 'findById').mockResolvedValue(mockMedia);
      mockR2Service.generatePresignedDownloadUrl.mockResolvedValue(
        mockPresignedUrl,
      );

      // Act
      const result = await service.generatePresignedDownloadUrl(id);

      // Assert
      expect(result).toBe(mockPresignedUrl);
      expect(mockR2Service.generatePresignedDownloadUrl).toHaveBeenCalledWith(
        mockMedia.key,
        3600,
      );
    });
  });

  describe('deleteMediaFile', () => {
    it('should delete media file from R2', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({ type: 'image' as MediaType });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);
      mockR2Service.deleteFile.mockResolvedValue(undefined);
      mockR2Service.generateThumbnailKey.mockReturnValue(
        'media/thumb_test.jpg',
      );
      mockR2Service.generatePreviewKey.mockReturnValue(
        'media/preview_test.jpg',
      );

      // Act
      await service.deleteMediaFile(id);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.deleteFile).toHaveBeenCalledWith(imageMedia.key);
      expect(mockR2Service.deleteFile).toHaveBeenCalledWith(
        'media/thumb_test.jpg',
      );
      expect(mockR2Service.deleteFile).toHaveBeenCalledWith(
        'media/preview_test.jpg',
      );
    });

    it('should handle non-image media types', async () => {
      // Arrange
      const id = '1234567890123456789';
      const videoMedia = createMockMedia({ type: 'video' as MediaType });

      jest.spyOn(service, 'findById').mockResolvedValue(videoMedia);
      mockR2Service.deleteFile.mockResolvedValue(undefined);

      // Act
      await service.deleteMediaFile(id);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.deleteFile).toHaveBeenCalledTimes(1);
      expect(mockR2Service.deleteFile).toHaveBeenCalledWith(videoMedia.key);
    });

    it('should handle thumbnail/preview deletion errors gracefully', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({ type: 'image' as MediaType });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);
      mockR2Service.deleteFile
        .mockResolvedValueOnce(undefined) // Main file deletion succeeds
        .mockRejectedValueOnce(new Error('Thumbnail not found')) // Thumbnail deletion fails
        .mockRejectedValueOnce(new Error('Preview not found')); // Preview deletion fails
      mockR2Service.generateThumbnailKey.mockReturnValue(
        'media/thumb_test.jpg',
      );
      mockR2Service.generatePreviewKey.mockReturnValue(
        'media/preview_test.jpg',
      );

      // Act
      await service.deleteMediaFile(id);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.deleteFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMediaFileStream', () => {
    it('should get media file stream', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mockStream = new Readable();

      jest.spyOn(service, 'findById').mockResolvedValue(mockMedia);
      mockR2Service.downloadFile.mockResolvedValue(mockStream);

      // Act
      const result = await service.getMediaFileStream(id);

      // Assert
      expect(result).toBe(mockStream);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.downloadFile).toHaveBeenCalledWith(mockMedia.key);
    });
  });

  describe('checkMediaFileExists', () => {
    it('should check if media file exists in R2', async () => {
      // Arrange
      const id = '1234567890123456789';
      const exists = true;

      jest.spyOn(service, 'findById').mockResolvedValue(mockMedia);
      mockR2Service.fileExists.mockResolvedValue(exists);

      // Act
      const result = await service.checkMediaFileExists(id);

      // Assert
      expect(result).toBe(exists);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.fileExists).toHaveBeenCalledWith(mockMedia.key);
    });
  });

  describe('getMediaFileMetadata', () => {
    it('should get media file metadata from R2', async () => {
      // Arrange
      const id = '1234567890123456789';
      const mockMetadata = {
        size: 1024000,
        lastModified: new Date(),
        contentType: 'image/jpeg',
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockMedia);
      mockR2Service.getFileMetadata.mockResolvedValue(mockMetadata);

      // Act
      const result = await service.getMediaFileMetadata(id);

      // Assert
      expect(result).toEqual(mockMetadata);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(mockR2Service.getFileMetadata).toHaveBeenCalledWith(mockMedia.key);
    });
  });

  describe('deleteMedia', () => {
    it('should delete media file and update status to deleted', async () => {
      // Arrange
      const id = '1234567890123456789';

      jest.spyOn(service, 'deleteMediaFile').mockResolvedValue(undefined);
      jest
        .spyOn(service, 'update')
        .mockResolvedValue(
          createMockMedia({ status: 'deleted' as MediaStatus }),
        );

      // Act
      await service.deleteMedia(id);

      // Assert
      expect(service.deleteMediaFile).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, { status: 'deleted' });
    });
  });

  describe('getSearchableColumns', () => {
    it('should return correct searchable columns', () => {
      // Act
      const result = (service as any).getSearchableColumns();

      // Assert
      expect(result).toEqual(['name', 'title', 'description', 'altText']);
    });
  });

  describe('determineMediaType', () => {
    it('should determine media type correctly for various MIME types', () => {
      const testCases = [
        { mimeType: 'image/jpeg', expectedType: 'image' },
        { mimeType: 'image/png', expectedType: 'image' },
        { mimeType: 'video/mp4', expectedType: 'video' },
        { mimeType: 'audio/mp3', expectedType: 'audio' },
        { mimeType: 'application/pdf', expectedType: 'document' },
        {
          mimeType: 'application/vnd.ms-powerpoint',
          expectedType: 'presentation',
        },
        { mimeType: 'application/vnd.ms-excel', expectedType: 'spreadsheet' },
        { mimeType: 'application/zip', expectedType: 'archive' },
        { mimeType: 'unknown/type', expectedType: 'other' },
      ];

      testCases.forEach(({ mimeType, expectedType }) => {
        // Act
        const result = (service as any).determineMediaType(mimeType);

        // Assert
        expect(result).toBe(expectedType);
      });
    });
  });

  describe('getScrambleKey', () => {
    const mockScrambleMetadata: ImageScrambleMetadata = {
      enabled: true,
      version: 1,
      salt: Buffer.from('test-salt-12345678').toString('base64'),
      tileRows: 24,
      tileCols: 12,
    };

    beforeEach(() => {
      // Reset config service mock to default
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'r2.folders.media': 'media',
          'app.imageScrambler': mockScramblerConfig,
        };
        return config[key];
      });
    });

    it('should return scramble key for valid image with metadata', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: JSON.stringify(mockScrambleMetadata),
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);

      // Act
      const result = await service.getScrambleKey(id);

      // Assert
      expect(result).toHaveProperty('permutationSeed');
      expect(result).toHaveProperty('tileRows', 24);
      expect(result).toHaveProperty('tileCols', 12);
      expect(result).toHaveProperty('version', 1);
      expect(typeof result.permutationSeed).toBe('string');
      expect(result.permutationSeed.length).toBeGreaterThan(0);
      expect(service.findById).toHaveBeenCalledWith(id);
    });

    it('should throw error when media not found', async () => {
      // Arrange
      const id = '1234567890123456789';
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(null as unknown as Media);

      // Act & Assert
      await expect(service.getScrambleKey(id)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.MEDIA_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw error when media is not an image', async () => {
      // Arrange
      const id = '1234567890123456789';
      const videoMedia = createMockMedia({
        type: 'video' as MediaType,
        metadata: JSON.stringify(mockScrambleMetadata),
      });

      jest.spyOn(service, 'findById').mockResolvedValue(videoMedia);

      // Act & Assert
      await expect(service.getScrambleKey(id)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.MEDIA_NOT_IMAGE' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when metadata is missing', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: undefined,
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);

      // Act & Assert
      await expect(service.getScrambleKey(id)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.SCRAMBLER_METADATA_MISSING' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when metadata is invalid JSON', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: 'invalid-json{',
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);

      // Act & Assert
      await expect(service.getScrambleKey(id)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.SCRAMBLER_METADATA_INVALID' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should throw error when scrambler is not enabled in metadata', async () => {
      // Arrange
      const id = '1234567890123456789';
      const disabledMetadata: ImageScrambleMetadata = {
        ...mockScrambleMetadata,
        enabled: false,
      };
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: JSON.stringify(disabledMetadata),
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);

      // Act & Assert
      await expect(service.getScrambleKey(id)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.SCRAMBLER_NOT_ENABLED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when scrambler config is disabled', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: JSON.stringify(mockScrambleMetadata),
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.imageScrambler') {
          return { ...mockScramblerConfig, enabled: false };
        }
        return mockConfigService.get.mock.results[0]?.value;
      });

      // Act & Assert
      await expect(service.getScrambleKey(id)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.SCRAMBLER_DISABLED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should use rotation duration when configured', async () => {
      // Arrange
      const id = '1234567890123456789';
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: JSON.stringify(mockScrambleMetadata),
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.imageScrambler') {
          return { ...mockScramblerConfig, rotationDurationSeconds: 3600 };
        }
        return mockConfigService.get.mock.results[0]?.value;
      });

      // Act
      const result = await service.getScrambleKey(id);

      // Assert
      expect(result).toHaveProperty('permutationSeed');
      expect(typeof result.permutationSeed).toBe('string');
    });

    it('should handle missing optional fields in metadata', async () => {
      // Arrange
      const id = '1234567890123456789';
      const incompleteMetadata = {
        enabled: true,
        salt: Buffer.from('test-salt-12345678').toString('base64'),
        tileRows: 24,
        tileCols: 12,
        // version is missing
      };
      const imageMedia = createMockMedia({
        type: 'image' as MediaType,
        metadata: JSON.stringify(incompleteMetadata),
      });

      jest.spyOn(service, 'findById').mockResolvedValue(imageMedia);

      // Act
      const result = await service.getScrambleKey(id);

      // Assert
      expect(result).toHaveProperty('version');
      // Should use version from config when not in metadata
      expect(result.version).toBe(mockScramblerConfig.version);
    });
  });
});
