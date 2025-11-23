import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Character, CharacterStaff } from 'src/characters/entities';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { CacheService } from 'src/shared/services';
import { DeepPartial, Repository } from 'typeorm';
import { CharacterRoleDto, CreateStaffDto, UpdateStaffDto } from './dto';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffsService extends BaseService<Staff> {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,

    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,

    @InjectRepository(CharacterStaff)
    private readonly characterStaffRepository: Repository<CharacterStaff>,

    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Staff>(staffRepository),
      {
        entityName: 'Staff',
        cache: { enabled: true, ttlSec: 60, prefix: 'staffs', swrSec: 30 },
        defaultSearchField: 'description',
        relationsWhitelist: {
          image: true,
          characterRoles: {
            character: {
              image: true,
            },
          },
          seriesRoles: {
            series: true,
          },
        },
        selectWhitelist: {
          id: true,
          myAnimeListId: true,
          aniListId: true,
          name: true,
          language: true,
          imageId: true,
          image: {
            id: true,
            url: true,
            type: true,
          },
          description: true,
          primaryOccupations: true,
          gender: true,
          dateOfBirth: true,
          dateOfDeath: true,
          age: true,
          debutDate: true,
          homeTown: true,
          bloodType: true,
          siteUrl: true,
          notes: true,
          status: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          characterRoles: {
            id: true,
            characterId: true,
            staffId: true,
            language: true,
            isPrimary: true,
            sortOrder: true,
            notes: true,
            character: {
              id: true,
              name: true,
              image: {
                id: true,
                url: true,
              },
            },
          },
          seriesRoles: {
            id: true,
            role: true,
            isMain: true,
            notes: true,
            sortOrder: true,
            series: {
              id: true,
              title: true,
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
  protected getSearchableColumns(): (keyof Staff)[] {
    return ['description', 'gender', 'homeTown'];
  }

  /**
   * Lifecycle hook: before creating a staff
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Staff>,
  ): Promise<DeepPartial<Staff>> {
    // Convert ISO date strings to Date objects if provided as strings
    if (data.dateOfBirth && typeof data.dateOfBirth === 'string') {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.dateOfDeath && typeof data.dateOfDeath === 'string') {
      data.dateOfDeath = new Date(data.dateOfDeath);
    }
    if (data.debutDate && typeof data.debutDate === 'string') {
      data.debutDate = new Date(data.debutDate);
    }

    return data;
  }

  /**
   * Lifecycle hook: after creating a staff
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Staff): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating a staff
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Staff>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating a staff
   */
  protected async afterUpdate(_entity: Staff): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting a staff
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting a staff
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Create a staff with linked characters
   */
  async createWithCharacters(dto: CreateStaffDto): Promise<Staff> {
    const { characters, dateOfBirth, dateOfDeath, debutDate, ...staffData } =
      dto;

    // Prepare staff data
    const staffPartial: DeepPartial<Staff> = {
      ...staffData,
      // Convert ISO date strings to Date objects for timestamptz fields
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : undefined,
      debutDate: debutDate ? new Date(debutDate) : undefined,
    };

    // Create staff
    const staff = await this.create(staffPartial);

    // Link characters with role information if provided
    if (characters && characters.length > 0) {
      await this.linkCharactersWithRoles(staff.id, characters);
    }

    return this.findById(staff.id, {
      relations: [
        'characterRoles',
        'characterRoles.character',
        'characterRoles.character.image',
      ],
    });
  }

  /**
   * Update a staff and optionally update character links
   */
  async updateWithCharacters(id: string, dto: UpdateStaffDto): Promise<Staff> {
    const { characters, dateOfBirth, dateOfDeath, debutDate, ...staffData } =
      dto;

    // Prepare update data
    const updateData: DeepPartial<Staff> = {
      ...staffData,
    };

    // Convert ISO date strings to Date objects for timestamptz fields if provided
    if (dateOfBirth) {
      updateData.dateOfBirth = new Date(dateOfBirth);
    }
    if (dateOfDeath) {
      updateData.dateOfDeath = new Date(dateOfDeath);
    }
    if (debutDate) {
      updateData.debutDate = new Date(debutDate);
    }

    // Update staff
    await this.update(id, updateData);

    // Update character links if provided
    if (characters !== undefined) {
      await this.linkCharactersWithRoles(id, characters);
    }

    return this.findById(id, {
      relations: [
        'characterRoles',
        'characterRoles.character',
        'characterRoles.character.image',
      ],
    });
  }

  /**
   * Link characters to a staff member with role information
   * Uses CharacterStaff junction table to store relationship with language and role information
   * Based on AniList API StaffRoleType: https://docs.anilist.co/reference/object/staffroletype
   */
  async linkCharactersWithRoles(
    staffId: string,
    characterRoles: CharacterRoleDto[],
  ): Promise<void> {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
    });

    if (!staff) {
      return;
    }

    // Remove existing character-staff relationships for this staff
    await this.characterStaffRepository.delete({ staffId });

    // Create new CharacterStaff relationships
    for (let index = 0; index < characterRoles.length; index++) {
      const role = characterRoles[index];

      // Verify character exists
      const character = await this.characterRepository.findOne({
        where: { id: role.characterId },
      });

      if (!character) {
        continue;
      }

      // Create CharacterStaff junction entity
      const characterStaff = this.characterStaffRepository.create({
        staffId,
        characterId: role.characterId,
        language: role.dubGroup || undefined, // Use dubGroup as language if provided
        isPrimary: index === 0, // First character is primary
        sortOrder: index,
        notes: role.notes || undefined,
      });

      await this.characterStaffRepository.save(characterStaff);
    }

    // Invalidate cache
    await this.invalidateCacheForEntity(staffId);
  }

  /**
   * Link characters to a staff member (legacy method for backward compatibility)
   * @deprecated Use linkCharactersWithRoles instead
   */
  async linkCharacters(staffId: string, characterIds: string[]): Promise<void> {
    const characterRoles: CharacterRoleDto[] = characterIds.map((id) => ({
      characterId: id,
    }));
    await this.linkCharactersWithRoles(staffId, characterRoles);
  }

  /**
   * Get all staff with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Staff>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all staff with cursor pagination
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Staff>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get reaction counts for a staff
   * Uses ReactionsService to get counts for different reaction kinds
   * @param staffId Staff ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    staffId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('staff', staffId, kinds);
  }

  /**
   * Check if a user has reacted to a staff with a specific kind
   * @param userId User ID
   * @param staffId Staff ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    staffId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(userId, 'staff', staffId, kind);
  }

  /**
   * Get a staff by ID with reaction counts
   * @param id Staff ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Staff with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Staff & { reactionCounts?: ReactionCount[] }) | null> {
    const staff = await this.findById(id, {
      relations: [
        'characterRoles',
        'characterRoles.character',
        'characterRoles.character.image',
      ],
    });
    if (!staff) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...staff,
      reactionCounts,
    } as Staff & { reactionCounts?: ReactionCount[] };
  }
}
