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
import { UserPermissionService } from 'src/permissions/services/user-permission.service';
import { PermissionName } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import {
  DEFAULT_ROLES,
  EffectivePermissions,
  PERMISSIONS,
} from './constants/permissions.constants';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { EffectivePermissionsDto } from './dto/effective-permissions.dto';
import { GrantSegmentPermissionDto } from './dto/grant-segment-permission.dto';
import { RevokeSegmentPermissionDto } from './dto/revoke-segment-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';

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
          permissions: true,
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
      const roleData = {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions || '0',
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
      if (dto.permissions !== undefined)
        updateData.permissions = dto.permissions;
      if (dto.position !== undefined) updateData.position = dto.position;
      if (dto.color !== undefined) updateData.color = dto.color;
      if (dto.mentionable !== undefined)
        updateData.mentionable = dto.mentionable;
      if (dto.managed !== undefined) updateData.managed = dto.managed;
      if (dto.icon !== undefined) updateData.icon = dto.icon;
      if (dto.unicodeEmoji !== undefined)
        updateData.unicodeEmoji = dto.unicodeEmoji;

      return this.update(id, updateData);
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

      const saved = await this.userRoleRepository.save(userRoleData);
      // Refresh user's cached permissions after role assignment
      await this.userPermissionService.refreshUserPermissions(dto.userId);
      return saved;
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

  // ==================== PERMISSION CALCULATION ====================

  /**
   * Compute effective permissions for a user based on their roles
   * Calculates permissions by combining all user roles (OR operation)
   */
  async computeEffectivePermissions(
    dto: EffectivePermissionsDto,
  ): Promise<EffectivePermissions> {
    try {
      const { userId } = dto;

      if (!userId) {
        throw new HttpException(
          { messageKey: 'permission.INVALID_USER_ID' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 1. Load user roles (including @everyone role)
      const userRoles = await this.getUserRoles(userId);
      const roleIds = userRoles.map((ur) => ur.roleId);

      // Get the everyone role (should always exist)
      const everyoneRole = await this.findRoleByName(DEFAULT_ROLES.EVERYONE);
      if (everyoneRole) {
        roleIds.push(everyoneRole.id);
      }

      // Get role entities
      const roles = await this.roleRepository.find({
        where: { id: In(roleIds) },
      });

      // 2. Calculate base permissions from roles (OR operation)
      let permissions = 0n;
      for (const role of roles) {
        permissions |= BigInt(role.permissions);
      }

      // 3. Add permissions from UserPermission records (context-based permissions)
      // Note: TypeORM automatically excludes soft-deleted records when using DeleteDateColumn
      // No need to explicitly check deletedAt: null
      const userPermissions = await this.userPermissionRepository.find({
        where: {
          userId,
        },
      });

      // Filter valid (not expired) permissions
      const validUserPermissions = userPermissions.filter((up) => up.isValid());

      // Combine user-specific permissions with role permissions
      for (const userPerm of validUserPermissions) {
        permissions |= userPerm.getValueAsBigInt();
      }

      // Note: No ADMINISTRATOR permission - use role-based checks instead
      // OWNER role has all permissions by default

      return {
        mask: permissions,
        map: this.permissionsMaskToMap(permissions),
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error computing effective permissions for user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_CALCULATION_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permission: bigint): Promise<boolean> {
    const effective = await this.computeEffectivePermissions({
      userId,
    });
    return (effective.mask & permission) !== 0n;
  }

  /**
   * Get user permissions as bitfield (for backward compatibility with existing code)
   */
  async getUserPermissionsBitfield(userId: string): Promise<bigint> {
    const effective = await this.computeEffectivePermissions({
      userId,
    });
    return effective.mask;
  }

  /**
   * Get user permissions (for backward compatibility with existing code)
   */
  async getUserPermissions(userId: string): Promise<PermissionName[]> {
    const effective = await this.computeEffectivePermissions({ userId });
    const permissions: PermissionName[] = [];

    for (const [key, value] of Object.entries(PERMISSIONS)) {
      if ((effective.mask & value) !== 0n) {
        permissions.push(key as PermissionName);
      }
    }

    return permissions;
  }

  /**
   * Convert permission mask to human-readable boolean map
   */
  private permissionsMaskToMap(mask: bigint): Record<string, boolean> {
    const map: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(PERMISSIONS)) {
      map[key] = (mask & value) !== 0n;
    }

    return map;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Create default roles for a new server/guild
   */
  async createDefaultRoles(): Promise<Role[]> {
    const defaultRoles = [
      {
        name: DEFAULT_ROLES.EVERYONE,
        description: 'Default role assigned to all users',
        permissions: '0',
        position: 0,
        mentionable: false,
      },
      {
        name: DEFAULT_ROLES.MEMBER,
        description: 'Default role for server members',
        permissions: '0',
        position: 1,
        mentionable: false,
      },
      {
        name: DEFAULT_ROLES.MODERATOR,
        description: 'Server moderators with moderation permissions',
        permissions: this.calculateModeratorPermissions().toString(),
        position: 2,
        mentionable: true,
      },
      {
        name: DEFAULT_ROLES.ADMIN,
        description: 'Server administrators with administrative permissions',
        permissions: this.calculateAdminPermissions().toString(),
        position: 3,
        mentionable: true,
      },
      {
        name: DEFAULT_ROLES.OWNER,
        description: 'Server owner with full permissions',
        permissions: (~0n).toString(),
        position: 4,
        mentionable: true,
      },
    ];

    const createdRoles: Role[] = [];
    for (const roleData of defaultRoles) {
      const role = await this.create(roleData);
      createdRoles.push(role);
    }

    return createdRoles;
  }

  /**
   * Calculate permissions for moderator role using existing constants
   * Moderators can read and moderate content, but cannot manage all articles
   */
  private calculateModeratorPermissions(): bigint {
    return (
      PERMISSIONS.ARTICLE_READ |
      PERMISSIONS.ARTICLE_UPDATE |
      PERMISSIONS.SERIES_UPDATE |
      PERMISSIONS.MEDIA_UPLOAD |
      PERMISSIONS.STICKER_READ |
      PERMISSIONS.REPORT_READ |
      PERMISSIONS.REPORT_MODERATE
    );
  }

  /**
   * Calculate permissions for admin role using existing constants
   * Admins have most permissions but not full owner access
   */
  private calculateAdminPermissions(): bigint {
    return (
      this.calculateModeratorPermissions() |
      PERMISSIONS.ARTICLE_CREATE |
      PERMISSIONS.ARTICLE_MANAGE_ALL |
      PERMISSIONS.SERIES_CREATE |
      PERMISSIONS.SEGMENTS_CREATE |
      PERMISSIONS.SEGMENTS_UPDATE |
      PERMISSIONS.STICKER_CREATE |
      PERMISSIONS.STICKER_UPDATE |
      PERMISSIONS.STICKER_DELETE |
      PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS |
      PERMISSIONS.ORGANIZATION_MANAGE_SETTINGS |
      PERMISSIONS.ORGANIZATION_VIEW_ANALYTICS |
      PERMISSIONS.ORGANIZATION_INVITE_MEMBERS
    );
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
      // Get permission bitmask
      const permissionBit = PERMISSIONS[dto.permission];
      if (!permissionBit) {
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
      const userPermissionData = {
        userId: dto.userId,
        permission: dto.permission,
        value: permissionBit.toString(),
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
      // 1. Check if user has general SEGMENTS_UPDATE permission (from roles)
      const hasGeneralPermission = await this.hasPermission(
        userId,
        PERMISSIONS.SEGMENTS_UPDATE,
      );

      if (hasGeneralPermission) {
        return true;
      }

      // 2. Check if user has specific permission for this segment
      const segmentPermission = await this.userPermissionRepository.findOne({
        where: {
          userId,
          permission: 'SEGMENTS_UPDATE',
          contextId: segmentId,
          contextType: 'segment',
        },
      });

      if (segmentPermission && segmentPermission.isValid()) {
        return true;
      }

      return false;
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
}
