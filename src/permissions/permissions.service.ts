import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { seedPermissions } from 'src/db/seed/permissions.seed';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UserPermissionService } from 'src/permissions/services/user-permission.service';
import { CacheService } from 'src/shared/services';
import { FindOptionsWhere, Repository } from 'typeorm';
import { DEFAULT_ROLES } from './constants/permissions.constants';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { GrantSegmentPermissionDto } from './dto/grant-segment-permission.dto';
import { RevokeSegmentPermissionDto } from './dto/revoke-segment-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { ScopePermission } from './entities/scope-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { EffectivePermissions } from './interfaces/effective-permissions.interface';
import { PermissionEvaluator } from './services/permission-evaluator.service';
import { PermissionRegistry } from './services/permission-registry.service';
import { ScopePermissionService } from './services/scope-permission.service';
import { PermissionKey } from './types/permission-key.type';

/**
 * Permissions service implementing Discord-style permission system
 * Handles role management, user-role assignments,
 * and effective permission calculations using BigInt bitwise operations
 */
@Injectable()
export class PermissionsService
  extends BaseService<Role>
  implements OnModuleInit
{
  private readonly logger = new Logger(PermissionsService.name);
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,

    cacheService: CacheService,

    @Inject(forwardRef(() => UserPermissionService))
    private readonly userPermissionService: UserPermissionService,

    @Inject(forwardRef(() => PermissionEvaluator))
    private readonly permissionEvaluator: PermissionEvaluator,

    @Inject(forwardRef(() => ScopePermissionService))
    private readonly scopePermissionService: ScopePermissionService,

    @Inject(forwardRef(() => PermissionRegistry))
    private readonly permissionRegistry: PermissionRegistry,
  ) {
    super(
      new TypeOrmBaseRepository<Role>(roleRepository),
      {
        entityName: 'Role',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'permissions:role',
          swrSec: 60,
        },
        defaultSearchField: 'name',
        relationsWhitelist: {
          userRoles: true,
        },
        selectWhitelist: {
          id: true,
          name: true,
          description: true,
          allowPermissions: true,
          denyPermissions: true,
          scopeType: true,
          scopeId: true,
          position: true,
          color: true,
          mentionable: true,
          managed: true,
          icon: true,
          unicodeEmoji: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Initialize permissions data when module starts
   */
  async onModuleInit(): Promise<void> {
    await this.initializeData();
  }

  /**
   * Initialize permissions data if not already exists
   * Checks for existing data before seeding to avoid duplicates
   */
  private async initializeData(): Promise<void> {
    try {
      // Check if roles already exist
      const existingRolesCount = await this.roleRepository.count();

      if (existingRolesCount === 0) {
        this.logger.log('No roles found, initializing permissions data...');

        // Get DataSource from repository to pass to seed function
        const dataSource = this.roleRepository.manager.connection;
        await seedPermissions(dataSource);

        this.logger.log(
          'Permissions data initialization completed successfully',
        );
      } else {
        this.logger.log(
          `Permissions data already exists (${existingRolesCount} roles found), skipping initialization`,
        );
      }
    } catch (error) {
      this.logger.error('Error initializing permissions data:', error);
      throw error;
    }
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Role)[] {
    return ['name', 'description'];
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Create a new role
   */
  async createRole(dto: CreateRoleDto): Promise<Role> {
    try {
      // Map permissions to allowPermissions if provided
      const allowPermissions = dto.permissions || '0';
      const roleData = {
        name: dto.name,
        description: dto.description,
        allowPermissions,
        denyPermissions: '0',
        position: dto.position || 0,
        color: dto.color,
        mentionable: dto.mentionable || false,
        managed: dto.managed || false,
        icon: dto.icon,
        unicodeEmoji: dto.unicodeEmoji,
      };

      return this.create(roleData);
    } catch (error: any) {
      this.logger.error('Error creating role:', error);
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    try {
      const role = await this.findById(id);
      if (!role) {
        throw new HttpException(
          { messageKey: 'permission.ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      const updateData: Partial<Role> = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      // Map permissions to allowPermissions if provided
      if (dto.permissions !== undefined) {
        updateData.allowPermissions = dto.permissions;
        // Ensure denyPermissions is set if not already
        if (updateData.denyPermissions === undefined) {
          updateData.denyPermissions = '0';
        }
      }
      if (dto.position !== undefined) updateData.position = dto.position;
      if (dto.color !== undefined) updateData.color = dto.color;
      if (dto.mentionable !== undefined)
        updateData.mentionable = dto.mentionable;
      if (dto.managed !== undefined) updateData.managed = dto.managed;
      if (dto.icon !== undefined) updateData.icon = dto.icon;
      if (dto.unicodeEmoji !== undefined)
        updateData.unicodeEmoji = dto.unicodeEmoji;

      const updated = await this.update(id, updateData);

      // Invalidate cache for all users with this role
      const userRoles = await this.userRoleRepository.find({
        where: { roleId: id },
      });
      const userIds = userRoles.map((ur) => ur.userId);
      for (const userId of userIds) {
        await this.permissionEvaluator.invalidateUserCache(userId);
      }

      return updated;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error updating role ${id}:`, error);
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a role by name
   */
  async findRoleByName(name: string): Promise<Role | null> {
    return this.findOne({ name });
  }

  /**
   * Get all roles ordered by position (highest first)
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { position: 'DESC', createdAt: 'ASC' },
      select: this.opts.selectWhitelist,
    });
  }

  // ==================== USER-ROLE MANAGEMENT ====================

  /**
   * Assign a role to a user
   */
  async assignRole(dto: AssignRoleDto): Promise<UserRole> {
    try {
      // Check if role exists
      const role = await this.findById(dto.roleId);
      if (!role) {
        throw new HttpException(
          { messageKey: 'permission.ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Check if assignment already exists
      const existingAssignment = await this.userRoleRepository.findOne({
        where: { userId: dto.userId, roleId: dto.roleId },
      });

      if (existingAssignment) {
        throw new HttpException(
          { messageKey: 'permission.USER_ROLE_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const userRoleData = {
        userId: dto.userId,
        roleId: dto.roleId,
        reason: dto.reason,
        assignedBy: dto.assignedBy,
        isTemporary: dto.isTemporary || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };
      const userRole = this.userRoleRepository.create(userRoleData);
      await this.userRoleRepository.save(userRole);
      // Refresh user's cached permissions after role assignment
      await this.userPermissionService.refreshUserPermissions(dto.userId);
      // Invalidate cache
      await this.permissionEvaluator.invalidateUserCache(dto.userId);
      return userRole;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error assigning role ${dto.roleId} to user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    try {
      const assignment = await this.userRoleRepository.findOne({
        where: { userId, roleId },
      });

      if (!assignment) {
        throw new HttpException(
          { messageKey: 'permission.USER_ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      await this.userRoleRepository.remove(assignment);
      // Refresh user's cached permissions after role removal
      await this.userPermissionService.refreshUserPermissions(userId);
      // Invalidate cache
      await this.permissionEvaluator.invalidateUserCache(userId);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error removing role ${roleId} from user ${userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get all users with a specific role
   */
  async getUsersWithRole(roleId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { roleId },
      relations: ['role'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Check if a user has a specific role by role name
   * Returns true if the user has the role, false otherwise
   *
   * @param userId - User ID to check
   * @param roleName - Name of the role to check
   * @returns true if user has the role, false otherwise
   */
  async hasRoleName(userId: string, roleName: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);

      // Check if any of the user's roles matches the role name
      const hasRole = userRoles.some(
        (userRole) =>
          userRole.role &&
          userRole.role.name === roleName &&
          userRole.isValid(),
      );

      return hasRole;
    } catch (error) {
      this.logger.error(
        `Error checking role ${roleName} for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  // ==================== PERMISSION CALCULATION ====================
  // Use PermissionEvaluator methods for permission evaluation
  // getUserEffectivePermissions() replaces computeEffectivePermissions()
  // evaluate() replaces hasPermission() with bigint parameter

  // ==================== UTILITY METHODS ====================

  /**
   * Create default roles for a new organization
   * Creates roles with unique names per organization to avoid duplicate key conflicts
   *
   * @param organization - Organization entity to associate roles with
   * @returns Array of created roles
   */
  async createDefaultRoles(organization: Organization): Promise<Role[]> {
    // Create unique role names using organization slug to avoid conflicts
    const roleNamePrefix = `${organization.slug}-`;
    const defaultRoles = [
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.EVERYONE}`,
        description: 'Default role assigned to all users',
        permissions: '0', // Legacy field - use allowPermissions instead
        allowPermissions: '0',
        denyPermissions: '0',
        position: 0,
        mentionable: false,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.MEMBER}`,
        description: 'Default role for server members',
        permissions: '0', // Legacy field - use allowPermissions instead
        allowPermissions: '0',
        denyPermissions: '0',
        position: 1,
        mentionable: false,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.MODERATOR}`,
        description: 'Server moderators with moderation permissions',
        permissions: this.calculateModeratorPermissions().toString(), // Legacy field - use allowPermissions instead
        allowPermissions: this.calculateModeratorPermissions().toString(),
        denyPermissions: '0',
        position: 2,
        mentionable: true,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.ADMIN}`,
        description: 'Server administrators with administrative permissions',
        permissions: this.calculateAdminPermissions().toString(), // Legacy field - use allowPermissions instead
        allowPermissions: this.calculateAdminPermissions().toString(),
        denyPermissions: '0',
        position: 3,
        mentionable: true,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.OWNER}`,
        description: 'Server owner with full permissions',
        permissions: (~0n).toString(), // Legacy field - use allowPermissions instead
        allowPermissions: (~0n).toString(), // All permissions allowed
        denyPermissions: '0',
        position: 4,
        mentionable: true,
        organization,
      },
    ];

    const createdRoles: Role[] = [];
    for (const roleData of defaultRoles) {
      // Check if role already exists to avoid duplicate key error
      const existingRole = await this.findOne(
        { name: roleData.name },
        { relations: ['organization'] },
      );

      if (existingRole) {
        // Role already exists, use it instead of creating new one
        createdRoles.push(existingRole);
      } else {
        // Create new role
        const role = await this.create(roleData);
        createdRoles.push(role);
      }
    }

    return createdRoles;
  }

  /**
   * Calculate permissions for moderator role using PermissionKeys
   * Moderators can read and moderate content, but cannot manage all articles
   */
  private calculateModeratorPermissions(): bigint {
    const permissionKeys: PermissionKey[] = [
      'article.read',
      'article.update',
      'series.update',
      'media.create',
      'sticker.read',
      'report.read',
      'report.update',
    ];
    return this.permissionRegistry.getBitMasks(permissionKeys);
  }

  /**
   * Calculate permissions for admin role using PermissionKeys
   * Admins have most permissions but not full owner access
   */
  private calculateAdminPermissions(): bigint {
    const permissionKeys: PermissionKey[] = [
      // Moderator permissions
      'article.read',
      'article.update',
      'series.update',
      'media.create',
      'sticker.read',
      'report.read',
      'report.update',
      // Admin additional permissions
      'article.create',
      'series.create',
      'segment.create',
      'segment.update',
      'sticker.create',
      'sticker.update',
      'sticker.delete',
      'organization.update',
      'organization.read',
    ];
    return this.permissionRegistry.getBitMasks(permissionKeys);
  }

  // ==================== SEGMENT PERMISSIONS MANAGEMENT ====================

  /**
   * Grant a permission to a user for a specific segment
   * Creates a UserPermission record with segment context
   */
  async grantSegmentPermission(
    dto: GrantSegmentPermissionDto,
  ): Promise<UserPermission> {
    try {
      // Get bitmask for PermissionKey
      const permissionKey = dto.permission;
      const permissionBit = this.permissionRegistry.getBitMask(permissionKey);
      if (permissionBit === 0n) {
        throw new HttpException(
          { messageKey: 'permission.INVALID_PERMISSION' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if permission already exists
      const existing = await this.userPermissionRepository.findOne({
        where: {
          userId: dto.userId,
          permission: dto.permission,
          contextId: dto.segmentId,
          contextType: 'segment',
        },
      });

      if (existing && !existing.isDeleted()) {
        throw new HttpException(
          { messageKey: 'permission.USER_PERMISSION_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create or restore permission
      // Use allowPermissions and denyPermissions fields
      const userPermissionData = {
        userId: dto.userId,
        permission: dto.permission,
        allowPermissions: permissionBit.toString(),
        denyPermissions: '0',
        contextId: dto.segmentId,
        contextType: 'segment',
        reason: dto.reason,
        grantedBy: dto.grantedBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };

      let saved: UserPermission;
      if (existing) {
        // Restore soft-deleted permission
        Object.assign(existing, userPermissionData);
        existing.deletedAt = null;
        saved = await this.userPermissionRepository.save(existing);
      } else {
        saved = await this.userPermissionRepository.save(userPermissionData);
      }

      // Refresh user's cached permissions
      await this.userPermissionService.refreshUserPermissions(dto.userId);
      // Invalidate cache
      await this.permissionEvaluator.invalidateUserCache(dto.userId);

      this.logger.log(
        `Granted ${dto.permission} permission for segment ${dto.segmentId} to user ${dto.userId}`,
      );

      return saved;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error granting segment permission to user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Revoke a permission from a user for a specific segment
   * Soft deletes the UserPermission record
   */
  async revokeSegmentPermission(
    dto: RevokeSegmentPermissionDto,
  ): Promise<void> {
    try {
      const userPermission = await this.userPermissionRepository.findOne({
        where: {
          userId: dto.userId,
          permission: dto.permission,
          contextId: dto.segmentId,
          contextType: 'segment',
        },
      });

      if (!userPermission || userPermission.isDeleted()) {
        throw new HttpException(
          { messageKey: 'permission.USER_PERMISSION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      await this.userPermissionRepository.softDelete(userPermission.id);

      // Refresh user's cached permissions
      await this.userPermissionService.refreshUserPermissions(dto.userId);
      // Invalidate cache
      await this.permissionEvaluator.invalidateUserCache(dto.userId);

      this.logger.log(
        `Revoked ${dto.permission} permission for segment ${dto.segmentId} from user ${dto.userId}`,
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error revoking segment permission from user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a user can update a specific segment
   * Returns true if user has:
   * - General SEGMENTS_UPDATE permission (from roles), OR
   * - Specific SEGMENTS_UPDATE permission for this segment (from UserPermission)
   */
  async canUpdateSegment(userId: string, segmentId: string): Promise<boolean> {
    try {
      // Use permission evaluation
      return this.permissionEvaluator.evaluate(
        userId,
        'segment.update',
        'segment',
        segmentId,
      );
    } catch (error) {
      this.logger.error(
        `Error checking segment update permission for user ${userId} and segment ${segmentId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get all segment permissions for a user
   * Returns all UserPermission records with segment context
   */
  async getUserSegmentPermissions(userId: string): Promise<UserPermission[]> {
    return this.userPermissionRepository.find({
      where: {
        userId,
        contextType: 'segment',
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all users who have permission for a specific segment
   * Returns all UserPermission records for a segment
   */
  async getUsersWithSegmentPermission(
    segmentId: string,
    permission?: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE',
  ): Promise<UserPermission[]> {
    const where: FindOptionsWhere<UserPermission> = {
      contextId: segmentId,
      contextType: 'segment',
      ...(permission && { permission }),
    };

    return this.userPermissionRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== GENERIC CONTEXT PERMISSIONS ====================

  /**
   * Generic method to check if user has permission for a specific resource context
   * Works with any context type (segment, article, organization, etc.)
   *
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param contextType - Type of context (e.g., 'segment', 'article')
   * @param contextId - ID of the resource
   * @returns true if user has permission (general OR context-specific)
   */
  async hasContextPermission(
    userId: string,
    permissionKey: PermissionKey,
    contextType: string,
    contextId: string,
  ): Promise<boolean> {
    try {
      // Use permission evaluation with context
      return this.permissionEvaluator.evaluate(
        userId,
        permissionKey,
        contextType,
        contextId,
      );
    } catch (error) {
      this.logger.error(
        `Error checking context permission for user ${userId}, context ${contextType}:${contextId}, permission ${permissionKey}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has any of the required permissions for a context
   * @param userId - User ID
   * @param permissionKeys - Array of PermissionKeys to check
   * @param contextType - Type of context
   * @param contextId - ID of the resource
   * @returns true if user has at least one of the permissions
   */
  async hasAnyContextPermission(
    userId: string,
    permissionKeys: PermissionKey[],
    contextType: string,
    contextId: string,
  ): Promise<boolean> {
    for (const permissionKey of permissionKeys) {
      if (
        await this.hasContextPermission(
          userId,
          permissionKey,
          contextType,
          contextId,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the required permissions for a context
   * @param userId - User ID
   * @param permissionKeys - Array of PermissionKeys to check
   * @param contextType - Type of context
   * @param contextId - ID of the resource
   * @returns true if user has all permissions
   */
  async hasAllContextPermissions(
    userId: string,
    permissionKeys: PermissionKey[],
    contextType: string,
    contextId: string,
  ): Promise<boolean> {
    for (const permissionKey of permissionKeys) {
      if (
        !(await this.hasContextPermission(
          userId,
          permissionKey,
          contextType,
          contextId,
        ))
      ) {
        return false;
      }
    }
    return true;
  }

  // ==================== PERMISSION METHODS ====================

  /**
   * Evaluate if a user has a specific permission
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns true if user has permission, false otherwise
   */
  async evaluate(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string,
  ): Promise<boolean> {
    return this.permissionEvaluator.evaluate(
      userId,
      permissionKey,
      scopeType,
      scopeId,
    );
  }

  /**
   * Get effective permissions for a user in a scope
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns EffectivePermissions with all permissions
   */
  async getUserEffectivePermissions(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): Promise<EffectivePermissions> {
    return this.permissionEvaluator.getEffectivePermissions(
      userId,
      scopeType,
      scopeId,
    );
  }

  /**
   * Grant a scope permission
   * @param scopeType - Type of scope
   * @param scopeId - ID of scope
   * @param permissionKey - PermissionKey to grant
   * @param allow - Whether to allow (true) or deny (false)
   * @returns Created or updated scope permission
   */
  async grantScopePermission(
    scopeType: string,
    scopeId: string,
    permissionKey: string,
    allow: boolean = true,
  ): Promise<ScopePermission> {
    return this.scopePermissionService.grantScopePermission(
      scopeType,
      scopeId,
      permissionKey,
      allow,
    );
  }

  /**
   * Revoke a scope permission
   * @param scopeType - Type of scope
   * @param scopeId - ID of scope
   * @param permissionKey - PermissionKey to revoke
   */
  async revokeScopePermission(
    scopeType: string,
    scopeId: string,
    permissionKey: string,
  ): Promise<void> {
    return this.scopePermissionService.revokeScopePermission(
      scopeType,
      scopeId,
      permissionKey,
    );
  }

  /**
   * Update role permissions using bitfields
   * @param roleId - Role ID
   * @param allowPermissions - Allow permissions bitmask
   * @param denyPermissions - Deny permissions bitmask
   * @returns Updated role
   */
  async updateRolePermissions(
    roleId: string,
    allowPermissions: string,
    denyPermissions: string,
  ): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) {
      throw new HttpException(
        { messageKey: 'permission.ROLE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    role.allowPermissions = allowPermissions;
    role.denyPermissions = denyPermissions;

    const updated = await this.update(roleId, {
      allowPermissions,
      denyPermissions,
    });

    // Invalidate cache for all users with this role
    const userRoles = await this.userRoleRepository.find({
      where: { roleId },
    });
    const userIds = userRoles.map((ur) => ur.userId);
    for (const userId of userIds) {
      await this.permissionEvaluator.invalidateUserCache(userId);
    }

    return updated;
  }
}
