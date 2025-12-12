import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { CacheService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { QuerySegmentCursorDto } from '../dto/query-segment-cursor.dto';
import { Segments } from '../entities/segments.entity';

/**
 * Segments Service
 *
 * Service for managing series segments (episodes for anime, chapters for manga/light novel).
 * Extends BaseService to provide CRUD operations, pagination, caching, and lifecycle hooks.
 */
@Injectable()
export class SegmentsService extends BaseService<Segments> {
  private readonly relationsWhitelist: FindOptionsRelations<Segments>;
  private readonly selectWhitelist: FindOptionsSelect<Segments> | undefined;

  constructor(
    @InjectRepository(Segments)
    private readonly segmentsRepository: Repository<Segments>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Segments>(segmentsRepository),
      {
        entityName: 'Segments',
        cache: { enabled: true, ttlSec: 60, prefix: 'segments', swrSec: 30 },
        defaultSearchField: 'title',
        relationsWhitelist: {
          series: true,
          user: true,
          organization: true,
          media: true,
          attachments: true,
        },
        selectWhitelist: {
          id: true,
          seriesId: true,
          userId: true,
          organizationId: true,
          type: true,
          number: true,
          subNumber: true,
          title: true,
          description: true,
          slug: true,
          summary: true,
          durationSec: true,
          pageCount: true,
          startPage: true,
          endPage: true,
          status: true,
          publishedAt: true,
          originalReleaseDate: true,
          accessType: true,
          languageCode: true,
          isNsfw: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          series: {
            id: true,
            title: true,
            type: true,
            format: true,
            coverImageUrls: true,
            status: true,
          },
          user: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
          organization: {
            id: true,
            name: true,
            slug: true,
          },
          media: {
            id: true,
            name: true,
            title: true,
            url: true,
            type: true,
            mimeType: true,
            size: true,
            status: true,
          },
          attachments: {
            id: true,
            name: true,
            title: true,
            url: true,
            type: true,
            mimeType: true,
            size: true,
            status: true,
          },
        },
      },
      cacheService,
    );

    // Store whitelists for internal use
    this.relationsWhitelist = {
      series: true,
      user: true,
      organization: true,
      media: true,
      attachments: true,
    };
  }

  async findById(id: string): Promise<Segments> {
    return await super.findById(id, {
      relations: this.relationsWhitelist,
    });
  }

  /**
   * Define which fields can be searched
   * Override to specify searchable columns for segments
   */
  protected getSearchableColumns(): (keyof Segments)[] {
    return ['title', 'description', 'summary', 'slug'];
  }

  /**
   * Lifecycle hook: before creating a segment
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Segments>,
  ): Promise<DeepPartial<Segments>> {
    // Ensure isNsfw defaults to false if not provided
    if (data.isNsfw === undefined) {
      data.isNsfw = false;
    }

    // Ensure number is provided and valid
    if (data.number === undefined || data.number === null) {
      throw new Error('Segment number is required');
    }

    // Ensure type is provided
    if (!data.type) {
      throw new Error('Segment type is required');
    }

    // Ensure seriesId is provided
    if (!data.seriesId) {
      throw new Error('Series ID is required');
    }

    return data;
  }

  /**
   * Lifecycle hook: after creating a segment
   * Handle post-creation side effects (e.g., cache invalidation, notifications)
   */
  protected async afterCreate(_entity: Segments): Promise<void> {
    // BaseService handles cache invalidation automatically
    // Additional side effects can be added here:
    // - Send notifications
    // - Update series episode/chapter count
    // - Emit domain events
  }

  /**
   * Lifecycle hook: before updating a segment
   * Validate and normalize update data
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Segments>,
  ): Promise<void> {
    // Add any validation or normalization logic here
    // Note: Modifications to patch should be done directly on the patch object
    // BaseService will handle the update after this hook
  }

  /**
   * Lifecycle hook: after updating a segment
   * Handle post-update side effects
   */
  protected async afterUpdate(_entity: Segments): Promise<void> {
    // BaseService handles cache invalidation automatically
    // Additional side effects can be added here
  }

  /**
   * Lifecycle hook: before deleting a segment
   * Perform pre-deletion checks
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Add pre-deletion validation or checks here
    // e.g., check if segment has active subscriptions, etc.
  }

  /**
   * Lifecycle hook: after deleting a segment
   * Handle post-deletion cleanup
   */
  protected async afterDelete(_id: string): Promise<void> {
    // BaseService handles cache invalidation automatically
    // Additional cleanup can be added here:
    // - Delete associated media files
    // - Update series counts
    // - Clean up related records
  }

  /**
   * Get all segments with offset pagination
   * @param paginationDto Pagination parameters
   * @returns Paginated list of segments
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Segments>> {
    return this.listOffset(paginationDto, undefined, {
      relations: this.relationsWhitelist,
    });
  }

  /**
   * Get all segments with cursor pagination
   * @param paginationDto Cursor pagination parameters
   * @returns Cursor-paginated list of segments
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Segments>> {
    return this.listCursor(
      paginationDto,
      {},
      {
        relations: {
          series: true,
        },
        select: {
          series: {
            id: true,
            title: true,
            coverImageUrls: true,
          },
        },
      },
    );
  }

  /**
   * Get segments by series ID
   * @param seriesId Series ID
   * @param paginationDto Optional pagination parameters
   * @returns List of segments for the specified series
   */
  async findBySeriesId(
    seriesId: string,
    paginationDto?: AdvancedPaginationDto,
  ): Promise<IPagination<Segments>> {
    const defaultPagination: AdvancedPaginationDto = {
      page: 1,
      limit: 50,
      sortBy: 'number',
      order: 'ASC',
    };
    return this.listOffset(
      paginationDto || defaultPagination,
      { seriesId },
      {
        relations: this.relationsWhitelist,
      },
    );
  }

  /**
   * Get segments by series ID with cursor pagination
   * @param seriesId Series ID
   * @param paginationDto Cursor pagination parameters
   * @returns Cursor-paginated list of segments for the specified series
   */
  async findBySeriesIdCursor(
    seriesId: string,
    paginationDto: QuerySegmentCursorDto,
  ): Promise<IPaginationCursor<Segments>> {
    return this.listCursor(
      paginationDto,
      { seriesId, languageCode: paginationDto.languageCode },
      {
        relations: {
          user: true,
        },
      },
    );
  }

  /**
   * Get segments by type (EPISODE, CHAPTER, TRAILER)
   * @param type Segment type
   * @param paginationDto Optional pagination parameters
   * @returns List of segments of the specified type
   */
  async findByType(
    type: string,
    paginationDto?: AdvancedPaginationDto,
  ): Promise<IPagination<Segments>> {
    const defaultPagination: AdvancedPaginationDto = {
      page: 1,
      limit: 50,
      sortBy: 'number',
      order: 'ASC',
    };
    return this.listOffset(
      paginationDto || defaultPagination,
      { type },
      {
        relations: this.relationsWhitelist,
      },
    );
  }

  /**
   * Get segments by status (ACTIVE, INACTIVE, PENDING, ARCHIVED)
   * @param status Segment status
   * @param paginationDto Optional pagination parameters
   * @returns List of segments with the specified status
   */
  async findByStatus(
    status: string,
    paginationDto?: AdvancedPaginationDto,
  ): Promise<IPagination<Segments>> {
    const defaultPagination: AdvancedPaginationDto = {
      page: 1,
      limit: 50,
      sortBy: 'number',
      order: 'ASC',
    };
    return this.listOffset(
      paginationDto || defaultPagination,
      { status },
      {
        relations: this.relationsWhitelist,
      },
    );
  }

  /**
   * Get segments by access type (FREE, PAID, SUBSCRIPTION, MEMBERSHIP)
   * @param accessType Access type
   * @param paginationDto Optional pagination parameters
   * @returns List of segments with the specified access type
   */
  async findByAccessType(
    accessType: string,
    paginationDto?: AdvancedPaginationDto,
  ): Promise<IPagination<Segments>> {
    const defaultPagination: AdvancedPaginationDto = {
      page: 1,
      limit: 50,
      sortBy: 'number',
      order: 'ASC',
    };
    return this.listOffset(
      paginationDto || defaultPagination,
      { accessType },
      {
        relations: this.relationsWhitelist,
      },
    );
  }

  /**
   * Get a segment by slug
   * @param slug Segment slug
   * @returns Segment entity or null if not found
   */
  async findBySlug(slug: string): Promise<Segments | null> {
    return this.findOne({ slug }, { relations: this.relationsWhitelist });
  }

  /**
   * Get segments by series ID and number
   * Useful for finding a specific episode/chapter in a series
   * @param seriesId Series ID
   * @param number Segment number
   * @param subNumber Optional sub-number for .5 episodes/chapters
   * @returns Segment entity or null if not found
   */
  async findBySeriesAndNumber(
    seriesId: string,
    number: number,
    subNumber?: number,
  ): Promise<Segments | null> {
    const where: FindOptionsWhere<Segments> = { seriesId, number };
    if (subNumber !== undefined) {
      where.subNumber = subNumber;
    }
    return this.findOne(where, { relations: this.relationsWhitelist });
  }

  /**
   * Get the next segment in a series
   * @param seriesId Series ID
   * @param currentNumber Current segment number
   * @param currentSubNumber Optional current sub-number
   * @returns Next segment or null if not found
   */
  async getNextSegment(
    seriesId: string,
    currentNumber: number,
    currentSubNumber?: number,
  ): Promise<Segments | null> {
    // Find all active segments for the series, ordered by number and subNumber
    const segments = await this.segmentsRepository.find({
      where: {
        seriesId,
        status: 'active',
      },
      order: {
        number: 'ASC',
        subNumber: 'ASC',
      },
    });

    // Find the next segment after the current one
    // Logic: number > currentNumber OR (number === currentNumber AND subNumber > currentSubNumber)
    for (const segment of segments) {
      const segmentSubNumber = segment.subNumber ?? 0;
      const currentSub = currentSubNumber ?? 0;

      if (
        segment.number > currentNumber ||
        (segment.number === currentNumber && segmentSubNumber > currentSub)
      ) {
        return segment;
      }
    }

    return null;
  }

  /**
   * Get the previous segment in a series
   * @param seriesId Series ID
   * @param currentNumber Current segment number
   * @param currentSubNumber Optional current sub-number
   * @returns Previous segment or null if not found
   */
  async getPreviousSegment(
    seriesId: string,
    currentNumber: number,
    currentSubNumber?: number,
  ): Promise<Segments | null> {
    // Find all active segments for the series, ordered by number and subNumber (descending)
    const segments = await this.segmentsRepository.find({
      where: {
        seriesId,
        status: 'active',
      },
      order: {
        number: 'DESC',
        subNumber: 'DESC',
      },
    });

    // Find the previous segment before the current one
    // Logic: number < currentNumber OR (number === currentNumber AND subNumber < currentSubNumber)
    for (const segment of segments) {
      const segmentSubNumber = segment.subNumber ?? 0;
      const currentSub = currentSubNumber ?? 0;

      if (
        segment.number < currentNumber ||
        (segment.number === currentNumber && segmentSubNumber < currentSub)
      ) {
        return segment;
      }
    }

    return null;
  }
}
