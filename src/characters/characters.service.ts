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
import { Character } from './entities/character.entity';

@Injectable()
export class CharactersService extends BaseService<Character> {
  constructor(
    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,
    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Character>(characterRepository),
      {
        entityName: 'Character',
        cache: { enabled: true, ttlSec: 60, prefix: 'characters', swrSec: 30 },
        defaultSearchField: 'description',
        relationsWhitelist: {},
        selectWhitelist: {
          id: true,
          name: true,
          image: true,
          description: true,
          gender: true,
          dateOfBirth: true,
          age: true,
          bloodType: true,
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
   * Since name is JSONB, we'll search in the name object fields
   */
  protected getSearchableColumns(): (keyof Character)[] {
    return ['description', 'gender', 'age'];
  }

  /**
   * Lifecycle hook: before creating a character
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Character>,
  ): Promise<DeepPartial<Character>> {
    // Data normalization can be added here if needed
    return data;
  }

  /**
   * Lifecycle hook: after creating a character
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Character): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating a character
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Character>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating a character
   */
  protected async afterUpdate(_entity: Character): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting a character
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting a character
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Get all characters with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Character>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all characters with cursor pagination
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Character>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get reaction counts for a character
   * Uses ReactionsService to get counts for different reaction kinds
   * @param characterId Character ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    characterId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('character', characterId, kinds);
  }

  /**
   * Check if a user has reacted to a character with a specific kind
   * @param userId User ID
   * @param characterId Character ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    characterId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(
      userId,
      'character',
      characterId,
      kind,
    );
  }

  /**
   * Get a character by ID with reaction counts
   * @param id Character ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Character with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Character & { reactionCounts?: ReactionCount[] }) | null> {
    const character = await this.findById(id);
    if (!character) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...character,
      reactionCounts,
    } as Character & { reactionCounts?: ReactionCount[] };
  }
}
