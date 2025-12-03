import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { CacheService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsRelations,
  FindOptionsSelect,
  Repository,
} from 'typeorm';
import { Series } from './entities/series.entity';

@Injectable()
export class SeriesService extends BaseService<Series> {
  private readonly relationsWhitelist: FindOptionsRelations<Series>;
  private readonly selectWhitelist: FindOptionsSelect<Series> | undefined;
  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Series>(seriesRepository),
      {
        entityName: 'Series',
        cache: { enabled: true, ttlSec: 60, prefix: 'series', swrSec: 30 },
        defaultSearchField: 'description',
        relationsWhitelist: {
          genres: {
            genre: true,
          },
          authorRoles: {
            author: true,
          },
          characters: true,
          staffRoles: {
            staff: true,
          },
          studioRoles: {
            studio: true,
          },
          tags: true,
          coverImage: true,
          bannerImage: true,
        },
        selectWhitelist: {
          id: true,
          myAnimeListId: true,
          aniListId: true,
          title: true,
          type: true,
          format: true,
          status: true,
          description: true,
          startDate: true,
          endDate: true,
          season: true,
          seasonYear: true,
          seasonInt: true,
          episodes: true,
          duration: true,
          chapters: true,
          volumes: true,
          countryOfOrigin: true,
          isLicensed: true,
          source: true,
          coverImageUrls: true,
          coverImage: {
            id: true,
            url: true,
            type: true,
          },
          bannerImageUrl: true,
          bannerImage: {
            id: true,
            url: true,
            type: true,
          },
          synonyms: true,
          averageScore: true,
          meanScore: true,
          popularity: true,
          isLocked: true,
          trending: true,
          isNsfw: true,
          autoCreateForumThread: true,
          isRecommendationBlocked: true,
          isReviewBlocked: true,
          notes: true,
          releasingStatus: true,
          externalLinks: true,
          streamingEpisodes: true,
          // metadata: true,
          createdAt: true,
          updatedAt: true,
          genres: {
            id: true,
            sortOrder: true,
            isPrimary: true,
            notes: true,
            genre: {
              id: true,
              slug: true,
              name: true,
              icon: true,
              color: true,
            },
          },
          authorRoles: {
            id: true,
            role: true,
            notes: true,
            isMain: true,
            sortOrder: true,
            author: {
              id: true,
              name: true,
            },
          },
          characters: {
            id: true,
            name: true,
            image: {
              id: true,
              url: true,
            },
          },
          staffRoles: {
            id: true,
            role: true,
            notes: true,
            isMain: true,
            sortOrder: true,
            staff: {
              id: true,
              name: true,
              image: {
                id: true,
                url: true,
              },
            },
          },
          studioRoles: {
            id: true,
            role: true,
            roleNotes: true,
            isMain: true,
            sortOrder: true,
            studio: {
              id: true,
              name: true,
              type: true,
            },
          },
          tags: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      cacheService,
    );
    this.relationsWhitelist = {
      genres: {
        genre: true,
      },
    };
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Series)[] {
    return ['description'];
  }

  /**
   * Lifecycle hook: before creating a series
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Series>,
  ): Promise<DeepPartial<Series>> {
    // Ensure popularity defaults to 0
    if (data.popularity === undefined) {
      data.popularity = 0;
    }

    // Ensure trending defaults to 0
    if (data.trending === undefined) {
      data.trending = 0;
    }

    // Ensure isLocked defaults to false
    if (data.isLocked === undefined) {
      data.isLocked = false;
    }

    // Ensure isNsfw defaults to false
    if (data.isNsfw === undefined) {
      data.isNsfw = false;
    }

    return data;
  }

  /**
   * Lifecycle hook: after creating a series
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Series): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating a series
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Series>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating a series
   */
  protected async afterUpdate(_entity: Series): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting a series
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting a series
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Get all series with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Series>> {
    return this.listOffset(paginationDto, undefined, {
      relations: this.relationsWhitelist,
    });
  }

  /**
   * Get all series with cursor pagination
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Series>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get reaction counts for a series
   * Uses ReactionsService to get counts for different reaction kinds
   * @param seriesId Series ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    seriesId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('series', seriesId, kinds);
  }

  /**
   * Check if a user has reacted to a series with a specific kind
   * @param userId User ID
   * @param seriesId Series ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    seriesId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(userId, 'series', seriesId, kind);
  }

  /**
   * Get a series by ID with reaction counts
   * @param id Series ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Series with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Series & { reactionCounts?: ReactionCount[] }) | null> {
    const series = await this.findById(id);
    if (!series) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...series,
      reactionCounts,
    } as Series & { reactionCounts?: ReactionCount[] };
  }
}
