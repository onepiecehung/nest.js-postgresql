import { Injectable, Logger } from '@nestjs/common';
import { PermissionsService } from 'src/permissions/permissions.service';
import { checkPermissions, hasPermission } from 'src/permissions/utils';
import { PermissionName } from 'src/shared/constants';

/**
 * High-performance permission checker with caching
 * Provides convenient methods for permission validation
 */
@Injectable()
export class PermissionChecker {
  private readonly logger = new Logger(PermissionChecker.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Check if user has a single permission
   * @param userId - User ID
   * @param permission - Permission to check
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasPermission(
    userId: string,
    permission: PermissionName,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);
      return hasPermission(userPermissions, permission);
    } catch (error) {
      this.logger.error(
        `Failed to check permission ${permission} for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has ALL required permissions (AND operation)
   * @param userId - User ID
   * @param permissions - Array of permissions that ALL must be present
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasAllPermissions(
    userId: string,
    permissions: PermissionName[],
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);
      return checkPermissions(userPermissions, { all: permissions });
    } catch (error) {
      this.logger.error(
        `Failed to check all permissions for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has ANY of the permissions (OR operation)
   * @param userId - User ID
   * @param permissions - Array of permissions where ANY can be present
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasAnyPermission(
    userId: string,
    permissions: PermissionName[],
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);
      return checkPermissions(userPermissions, { any: permissions });
    } catch (error) {
      this.logger.error(
        `Failed to check any permissions for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has NONE of the forbidden permissions (NOT operation)
   * @param userId - User ID
   * @param permissions - Array of permissions that must NOT be present
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasNonePermissions(
    userId: string,
    permissions: PermissionName[],
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);
      return checkPermissions(userPermissions, { none: permissions });
    } catch (error) {
      this.logger.error(
        `Failed to check none permissions for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Complex permission check with AND/OR/NOT logic
   * @param userId - User ID
   * @param options - Permission check options
   * @returns Promise<boolean>
   */
  async checkPermissions(
    userId: string,
    options: {
      all?: PermissionName[];
      any?: PermissionName[];
      none?: PermissionName[];
    },
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);
      return checkPermissions(userPermissions, options);
    } catch (error) {
      this.logger.error(
        `Failed to check complex permissions for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user is admin (has ARTICLE_MANAGE_ALL permission)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasPermission(userId, 'ARTICLE_MANAGE_ALL');
  }

  /**
   * Check if user is regular user (not admin)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isRegularUser(userId: string): Promise<boolean> {
    return !(await this.hasPermission(userId, 'ARTICLE_MANAGE_ALL'));
  }

  /**
   * Check if user can manage content (create + edit)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async canManageContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      all: ['ARTICLE_CREATE'],
      any: ['ARTICLE_UPDATE', 'ARTICLE_UPDATE'],
    });
  }

  /**
   * Check if user can moderate content
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async canModerateContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      any: ['ARTICLE_UPDATE', 'REPORT_MODERATE'],
    });
  }

  /**
   * Check if user can manage organization
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Promise<boolean>
   */
  async canManageOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    return this.checkPermissions(
      userId,
      {
        all: ['ORGANIZATION_MANAGE_MEMBERS', 'ORGANIZATION_MANAGE_SETTINGS'],
        none: ['ORGANIZATION_DELETE'],
      },
      organizationId,
    );
  }

  /**
   * Get user permissions as bitfield (cached)
   * @param userId - User ID
   * @param organizationId - Optional organization context
   * @returns Promise<bigint>
   */
  async getUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<bigint> {
    return this.permissionsService.getUserPermissionsBitfield(userId);
  }

  /**
   * Get user permissions as array of names (cached)
   * @param userId - User ID
   * @param _organizationId - Optional organization context
   * @returns Promise<PermissionName[]>
   */
  async getUserPermissionNames(
    userId: string,
    _organizationId?: string,
  ): Promise<PermissionName[]> {
    return this.permissionsService.getUserPermissions(userId);
  }
}
