import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { CacheService } from 'src/shared/services';
import { DeepPartial, Repository } from 'typeorm';
import { Studio } from './entities/studio.entity';
import { CreateStudioDto, UpdateStudioDto } from './dto';

@Injectable()
export class StudiosService extends BaseService<Studio> {
  constructor(
    @InjectRepository(Studio)
    private readonly studioRepository: Repository<Studio>,
    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Studio>(studioRepository),
      {
        entityName: 'Studio',
        cache: { enabled: true, ttlSec: 60, prefix: 'studios', swrSec: 30 },
        defaultSearchField: 'name',
        relationsWhitelist: {},
        selectWhitelist: {
          id: true,
          name: true,
          isAnimationStudio: true,
          siteUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Studio)[] {
    return ['name'];
  }

  /**
   * Lifecycle hook: before creating a studio
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Studio>,
  ): Promise<DeepPartial<Studio>> {
    // Ensure isAnimationStudio defaults to true if not provided
    if (data.isAnimationStudio === undefined) {
      data.isAnimationStudio = true;
    }

    return data;
  }

  /**
   * Lifecycle hook: after creating a studio
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Studio): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating a studio
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Studio>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating a studio
   */
  protected async afterUpdate(_entity: Studio): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting a studio
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting a studio
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Get all studios with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Studio>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all studios with cursor pagination
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Studio>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get reaction counts for a studio
   * Uses ReactionsService to get counts for different reaction kinds
   * @param studioId Studio ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    studioId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('studio', studioId, kinds);
  }

  /**
   * Check if a user has reacted to a studio with a specific kind
   * @param userId User ID
   * @param studioId Studio ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    studioId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(userId, 'studio', studioId, kind);
  }

  /**
   * Get a studio by ID with reaction counts
   * @param id Studio ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Studio with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Studio & { reactionCounts?: ReactionCount[] }) | null> {
    const studio = await this.findById(id);
    if (!studio) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...studio,
      reactionCounts,
    } as Studio & { reactionCounts?: ReactionCount[] };
  }
}
