import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { createSlug, generateUniqueSlug } from 'src/common/utils/slug.util';
import { PermissionsService } from 'src/permissions/permissions.service';
import { ORGANIZATION_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import {
  CreateOrganizationDto,
  GetOrganizationDto,
  UpdateOrganizationDto,
} from './dto';
import { Organization } from './entities/organization.entity';

/**
 * Organization Service
 *
 * Service for managing organizations, including CRUD operations,
 * membership management, and organization-specific business logic
 */
@Injectable()
export class OrganizationsService extends BaseService<Organization> {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    cacheService: CacheService,
    private readonly permissionsService: PermissionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Organization>(organizationRepository),
      {
        entityName: 'Organization',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'organizations',
          swrSec: 60,
        },
        defaultSearchField: 'name',
        relationsWhitelist: {
          owner: true,
          logo: true,
        },
        selectWhitelist: {
          id: true,
          name: true,
          slug: true,
          description: true,
          websiteUrl: true,
          logoUrl: true,
          visibility: true,
          status: true,
          memberCount: true,
          articleCount: true,
          owner: { id: true, username: true, avatar: { url: true } },
        },
      },
      cacheService,
    );
  }

  /**
   * Get searchable columns for organization search functionality
   * @returns Array of column names that can be searched
   */
  protected getSearchableColumns(): (keyof Organization)[] {
    return ['name', 'description', 'slug'];
  }

  /**
   * Create a new organization
   *
   * @param createOrganizationDto - Organization data to create
   * @returns Created organization
   */
  async createOrganization(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    try {
      // Generate slug if not provided
      if (!createOrganizationDto.slug) {
        createOrganizationDto.slug = await this.generateUniqueSlug(
          createOrganizationDto.name,
        );
      }

      const organizationData = {
        ...createOrganizationDto,
        ownerId: createOrganizationDto.ownerId,
        status: ORGANIZATION_CONSTANTS.STATUS.ACTIVE,
        visibility:
          createOrganizationDto.visibility ||
          ORGANIZATION_CONSTANTS.VISIBILITY.PUBLIC,
        memberCount: 1, // Owner is the first member
        articleCount: 0,
      };

      const organization = await this.create(organizationData);

      // Create default organization roles using permissions system
      // Roles are created with unique names per organization to avoid duplicate key conflicts
      try {
        const defaultRoles =
          await this.permissionsService.createDefaultRoles(organization);

        this.logger.log(
          `Created ${defaultRoles.length} default roles for organization ${organization.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create default roles for organization ${organization.id}`,
          error,
        );
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_DEFAULT_ROLES_FAILED' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return organization;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error creating organization:', error);
      throw new HttpException(
        { messageKey: 'organization.ORGANIZATION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an organization
   *
   * @param id - Organization ID to update
   * @param updateOrganizationDto - Update data
   * @returns Updated organization
   */
  async updateOrganization(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    try {
      const organization = await this.findById(id);
      if (!organization) {
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.update(id, updateOrganizationDto);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error updating organization ${id}:`, error);
      throw new HttpException(
        { messageKey: 'organization.ORGANIZATION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get organizations with filtering and pagination
   *
   * @param getOrganizationDto - Query parameters for filtering and pagination
   * @returns Paginated organizations
   */
  async findAll(getOrganizationDto: GetOrganizationDto) {
    return await this.listOffset(getOrganizationDto);
  }

  /**
   * Get organization by ID with full details
   *
   * @param id - Organization ID
   * @returns Organization with full details
   */
  async findById(id: string): Promise<Organization> {
    try {
      const organization = await super.findById(id, {
        relations: ['owner'],
      });

      if (!organization) {
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      return organization;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error finding organization ${id}:`, error);
      throw new HttpException(
        { messageKey: 'organization.ORGANIZATION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get organization by slug
   *
   * @param slug - Organization slug
   * @returns Organization or null if not found
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return await this.findOne({ slug }, { relations: ['owner'] });
  }

  /**
   * Get organizations owned by a specific user
   *
   * @param ownerId - User ID of the owner
   * @returns Array of organizations owned by the user
   */
  async findByOwnerId(ownerId: string): Promise<Organization[]> {
    return await this.organizationRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get organizations where a user is a member
   *
   * @param userId - User ID
   * @returns Array of organizations where user is a member
   */
  async findByMemberId(userId: string): Promise<Organization[]> {
    return await this.organizationRepository
      .createQueryBuilder('organization')
      .innerJoin(
        'user_organizations',
        'uo',
        'uo.organizationId = organization.id',
      )
      .where('uo.userId = :userId', { userId })
      .andWhere('uo.isActive = :isActive', { isActive: true })
      .orderBy('organization.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Generate a unique slug for an organization
   *
   * @param name - Organization name to generate slug from
   * @returns Unique slug string
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = createSlug(name, {
      maxLength: ORGANIZATION_CONSTANTS.SLUG_MAX_LENGTH,
    });

    // Get existing slugs to check for uniqueness
    const existingSlugs = await this.organizationRepository
      .find({
        where: {},
        select: ['slug'],
      })
      .then((orgs) => orgs.map((org) => org.slug));

    return generateUniqueSlug(baseSlug, existingSlugs, {
      maxLength: ORGANIZATION_CONSTANTS.SLUG_MAX_LENGTH,
    });
  }

  /**
   * Update member count for an organization
   *
   * @param organizationId - Organization ID
   * @param increment - Amount to increment (positive) or decrement (negative)
   */
  async updateMemberCount(
    organizationId: string,
    increment: number,
  ): Promise<void> {
    await this.organizationRepository.increment(
      { id: organizationId },
      'memberCount',
      increment,
    );
  }

  /**
   * Update article count for an organization
   *
   * @param organizationId - Organization ID
   * @param increment - Amount to increment (positive) or decrement (negative)
   */
  async updateArticleCount(
    organizationId: string,
    increment: number,
  ): Promise<void> {
    await this.organizationRepository.increment(
      { id: organizationId },
      'articleCount',
      increment,
    );
  }

  /**
   * Delete an organization (soft delete)
   *
   * @param id - Organization ID to delete
   */
  async remove(id: string): Promise<void> {
    try {
      const organization = await this.findById(id);
      if (!organization) {
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // TODO: Implement cascade logic for related entities
      // This should handle:
      // - User memberships (soft delete)
      // - Article associations (set to null or delete)
      // - Cache invalidation

      return await this.softDelete(id);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error removing organization ${id}:`, error);
      throw new HttpException(
        { messageKey: 'organization.ORGANIZATION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a user has permission to perform an action on an organization
   *
   * @param userId - User ID to check permissions for
   * @param organizationId - Organization ID
   * @param permission - Permission to check (e.g., 'ORGANIZATION_MANAGE_MEMBERS')
   * @returns True if user has the required permission
   */
  async hasOrganizationPermission(
    userId: string,
    organizationId: string,
    permission: string,
  ): Promise<boolean> {
    // Check if user is organization owner (always has all permissions)
    const organization = await this.findById(organizationId);
    if (organization?.ownerId === userId) {
      return true;
    }

    // Check if user has the specific permission through roles
    return await this.permissionsService.hasPermission(
      userId,
      BigInt(permission),
    );
  }

  /**
   * Get organization members with their roles and permissions
   *
   * @param organizationId - Organization ID
   * @returns Array of user-organization relationships with role information
   */
  async getOrganizationMembers(organizationId: string) {
    return await this.organizationRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.userOrganizations', 'userOrg')
      .leftJoinAndSelect('userOrg.user', 'user')
      .leftJoinAndSelect('userOrg.role', 'role')
      .where('organization.id = :organizationId', { organizationId })
      .andWhere('userOrg.isActive = :isActive', { isActive: true })
      .getOne();
  }

  /**
   * Assign a role to a user within an organization
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param roleId - Role ID to assign
   * @param reason - Optional reason for assignment
   * @returns User role assignment
   */
  async assignOrganizationRole(
    userId: string,
    organizationId: string,
    roleId: string,
    reason?: string,
  ) {
    try {
      // Verify the role exists in the permissions system
      const role = await this.permissionsService.findById(roleId);
      if (!role) {
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Verify the user-organization relationship exists
      const userOrg = await this.organizationRepository
        .createQueryBuilder('org')
        .innerJoin('user_organizations', 'uo', 'uo.organizationId = org.id')
        .where('org.id = :organizationId', { organizationId })
        .andWhere('uo.userId = :userId', { userId })
        .andWhere('uo.isActive = :isActive', { isActive: true })
        .getOne();

      if (!userOrg) {
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_MEMBER_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Assign the role using permissions service
      return await this.permissionsService.assignRole({
        userId,
        roleId,
        reason: reason || `Assigned role in organization ${organizationId}`,
        assignedBy: userOrg.ownerId, // Organization owner assigns roles
        isTemporary: false,
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error assigning role ${roleId} to user ${userId} in organization ${organizationId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'organization.ORGANIZATION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove a role from a user within an organization
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param roleId - Role ID to remove
   */
  async removeOrganizationRole(
    userId: string,
    organizationId: string,
    roleId: string,
  ): Promise<void> {
    try {
      // Verify the user-organization relationship exists
      const organization = await this.findById(organizationId);
      if (!organization) {
        throw new HttpException(
          { messageKey: 'organization.ORGANIZATION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Remove the role using permissions service
      return await this.permissionsService.removeRole(userId, roleId);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error removing role ${roleId} from user ${userId} in organization ${organizationId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'organization.ORGANIZATION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
