import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { Series } from 'src/series/entities/series.entity';
import { CacheService } from 'src/shared/services';
import { DeepPartial, Repository } from 'typeorm';
import { CreateAuthorDto, SeriesRoleDto, UpdateAuthorDto } from './dto';
import { AuthorSeries } from './entities/author-series.entity';
import { Author } from './entities/author.entity';

@Injectable()
export class AuthorsService extends BaseService<Author> {
  constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,

    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,

    @InjectRepository(AuthorSeries)
    private readonly authorSeriesRepository: Repository<AuthorSeries>,

    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Author>(authorRepository),
      {
        entityName: 'Author',
        cache: { enabled: true, ttlSec: 60, prefix: 'authors', swrSec: 30 },
        defaultSearchField: 'description',
        relationsWhitelist: {
          seriesRoles: {
            series: true,
          },
        },
        selectWhitelist: {
          id: true,
          name: true,
          description: true,
          dateOfBirth: true,
          dateOfDeath: true,
          nationality: true,
          website: true,
          siteUrl: true,
          socialLinks: true,
          notes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          seriesRoles: {
            id: true,
            role: true,
            notes: true,
            isMain: true,
            sortOrder: true,
            series: {
              id: true,
              title: true,
              type: true,
              format: true,
              coverImage: {
                id: true,
                url: true,
              },
            },
          },
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Author)[] {
    return ['description', 'nationality'];
  }

  /**
   * Lifecycle hook: before creating an author
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Author>,
  ): Promise<DeepPartial<Author>> {
    // Data normalization can be added here if needed
    return data;
  }

  /**
   * Lifecycle hook: after creating an author
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Author): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating an author
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Author>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating an author
   */
  protected async afterUpdate(_entity: Author): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting an author
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting an author
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Create an author with linked series
   */
  async createWithSeries(dto: CreateAuthorDto): Promise<Author> {
    return this.create(dto);
  }

  /**
   * Update an author and optionally update series links
   */
  async updateWithSeries(id: string, dto: UpdateAuthorDto): Promise<Author> {
    return this.update(id, dto);
  }

  /**
   * Link series to an author with role information
   */
  async linkSeriesWithRoles(
    authorId: string,
    seriesRoles: SeriesRoleDto[],
  ): Promise<void> {
    const author = await this.authorRepository.findOne({
      where: { id: authorId },
    });

    if (!author) {
      return;
    }

    // Remove existing relationships for this author
    await this.authorSeriesRepository.delete({ authorId });

    // Create new relationships with role information
    const authorSeriesList = seriesRoles.map((role, index) => {
      return this.authorSeriesRepository.create({
        authorId,
        seriesId: role.seriesId,
        role: role.role,
        notes: role.notes,
        isMain: role.isMain || false,
        sortOrder: role.sortOrder !== undefined ? role.sortOrder : index, // Use provided sortOrder or index as default
      });
    });

    await this.authorSeriesRepository.save(authorSeriesList);

    // Invalidate cache
    await this.invalidateCacheForEntity(authorId);
  }

  /**
   * Get all authors with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Author>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all authors with cursor pagination
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Author>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get reaction counts for an author
   * Uses ReactionsService to get counts for different reaction kinds
   * @param authorId Author ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    authorId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('author', authorId, kinds);
  }

  /**
   * Check if a user has reacted to an author with a specific kind
   * @param userId User ID
   * @param authorId Author ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    authorId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(userId, 'author', authorId, kind);
  }

  /**
   * Get an author by ID with reaction counts
   * @param id Author ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Author with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Author & { reactionCounts?: ReactionCount[] }) | null> {
    const author = await this.findById(id, {
      relations: ['seriesRoles', 'seriesRoles.series'],
    });
    if (!author) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...author,
      reactionCounts,
    } as Author & { reactionCounts?: ReactionCount[] };
  }
}
