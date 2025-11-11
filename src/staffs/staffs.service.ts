import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { CacheService } from 'src/shared/services';
import { DeepPartial, In, Repository } from 'typeorm';
import { Character } from 'src/characters/entities/character.entity';
import { Staff } from './entities/staff.entity';
import { StaffCharacter } from './entities/staff-character.entity';
import {
  CreateStaffDto,
  UpdateStaffDto,
  CharacterRoleDto,
  LinkCharactersDto,
} from './dto';

@Injectable()
export class StaffsService extends BaseService<Staff> {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,

    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,

    @InjectRepository(StaffCharacter)
    private readonly staffCharacterRepository: Repository<StaffCharacter>,

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
          characterRoles: {
            character: true,
          },
        },
        selectWhitelist: {
          id: true,
          name: true,
          languageV2: true,
          image: true,
          description: true,
          primaryOccupations: true,
          gender: true,
          dateOfBirth: true,
          dateOfDeath: true,
          age: true,
          yearsActive: true,
          homeTown: true,
          bloodType: true,
          siteUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          characterRoles: {
            id: true,
            roleNotes: true,
            dubGroup: true,
            character: {
              id: true,
              name: true,
              image: true,
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
    // Convert yearsActive DTO to array format if needed
    if (
      data.yearsActive &&
      typeof data.yearsActive === 'object' &&
      'startYear' in data.yearsActive
    ) {
      const yearsActive = data.yearsActive as {
        startYear?: number;
        endYear?: number;
      };
      data.yearsActive = yearsActive.endYear
        ? [yearsActive.startYear, yearsActive.endYear]
        : [yearsActive.startYear];
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
    const { characters, ...staffData } = dto;

    // Prepare staff data
    const staffPartial: DeepPartial<Staff> = {
      ...staffData,
    };

    // Handle yearsActive conversion
    if (dto.yearsActive) {
      staffPartial.yearsActive = dto.yearsActive.endYear
        ? [dto.yearsActive.startYear, dto.yearsActive.endYear]
        : [dto.yearsActive.startYear];
    }

    // Create staff
    const staff = await this.create(staffPartial);

    // Link characters with role information if provided
    if (characters && characters.length > 0) {
      await this.linkCharactersWithRoles(staff.id, characters);
    }

    return this.findById(staff.id, {
      relations: ['characterRoles', 'characterRoles.character'],
    });
  }

  /**
   * Update a staff and optionally update character links
   */
  async updateWithCharacters(id: string, dto: UpdateStaffDto): Promise<Staff> {
    const { characters, ...staffData } = dto;

    // Handle yearsActive conversion if provided
    if (dto.yearsActive) {
      (staffData as DeepPartial<Staff>).yearsActive = dto.yearsActive.endYear
        ? [dto.yearsActive.startYear, dto.yearsActive.endYear]
        : [dto.yearsActive.startYear];
    }

    // Update staff
    await this.update(id, staffData);

    // Update character links if provided
    if (characters !== undefined) {
      await this.linkCharactersWithRoles(id, characters);
    }

    return this.findById(id, {
      relations: ['characterRoles', 'characterRoles.character'],
    });
  }

  /**
   * Link characters to a staff member with role information
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

    // Remove existing relationships for this staff
    await this.staffCharacterRepository.delete({ staffId });

    // Create new relationships with role information
    const staffCharacters = characterRoles.map((role) => {
      return this.staffCharacterRepository.create({
        staffId,
        characterId: role.characterId,
        roleNotes: role.roleNotes,
        dubGroup: role.dubGroup,
      });
    });

    await this.staffCharacterRepository.save(staffCharacters);

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
      relations: ['characterRoles', 'characterRoles.character'],
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
