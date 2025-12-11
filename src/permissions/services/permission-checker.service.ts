import { Injectable, Logger } from '@nestjs/common';
import { EffectivePermissions } from '../interfaces/effective-permissions.interface';
import { PermissionKey } from '../types/permission-key.type';
import { PermissionEvaluator } from './permission-evaluator.service';

/**
 * High-performance permission checker with caching
 * Provides convenient methods for permission validation
 */
@Injectable()
export class PermissionChecker {
  private readonly logger = new Logger(PermissionChecker.name);

  constructor(private readonly permissionEvaluator: PermissionEvaluator) {}

  /**
   * Check if user has a single permission
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param organizationId - Optional organization context (mapped to scopeType/scopeId)
   * @returns Promise<boolean>
   */
  async hasPermission(
    userId: string,
    permissionKey: PermissionKey,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      return this.permissionEvaluator.evaluate(
        userId,
        permissionKey,
        organizationId ? 'organization' : undefined,
        organizationId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check permission ${permissionKey} for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has ALL required permissions (AND operation)
   * @param userId - User ID
   * @param permissionKeys - Array of PermissionKeys that ALL must be present
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasAllPermissions(
    userId: string,
    permissionKeys: PermissionKey[],
    organizationId?: string,
  ): Promise<boolean> {
    try {
      if (permissionKeys.length === 0) {
        return false;
      }

      // Check all permissions
      for (const permissionKey of permissionKeys) {
        const hasPermission = await this.permissionEvaluator.evaluate(
          userId,
          permissionKey,
          organizationId ? 'organization' : undefined,
          organizationId,
        );
        if (!hasPermission) {
          return false;
        }
      }

      return true;
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
   * @param permissionKeys - Array of PermissionKeys where ANY can be present
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasAnyPermission(
    userId: string,
    permissionKeys: PermissionKey[],
    organizationId?: string,
  ): Promise<boolean> {
    try {
      if (permissionKeys.length === 0) {
        return false;
      }

      // Check if any permission is granted
      for (const permissionKey of permissionKeys) {
        const hasPermission = await this.permissionEvaluator.evaluate(
          userId,
          permissionKey,
          organizationId ? 'organization' : undefined,
          organizationId,
        );
        if (hasPermission) {
          return true;
        }
      }

      return false;
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
   * @param permissionKeys - Array of PermissionKeys that must NOT be present
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasNonePermissions(
    userId: string,
    permissionKeys: PermissionKey[],
    organizationId?: string,
  ): Promise<boolean> {
    try {
      if (permissionKeys.length === 0) {
        return true; // No forbidden permissions to check
      }

      // Check that none of the permissions are granted
      for (const permissionKey of permissionKeys) {
        const hasPermission = await this.permissionEvaluator.evaluate(
          userId,
          permissionKey,
          organizationId ? 'organization' : undefined,
          organizationId,
        );
        if (hasPermission) {
          return false; // User has a forbidden permission
        }
      }

      return true; // User has none of the forbidden permissions
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
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async checkPermissions(
    userId: string,
    options: {
      all?: PermissionKey[];
      any?: PermissionKey[];
      none?: PermissionKey[];
    },
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const scopeType = organizationId ? 'organization' : undefined;
      const scopeId = organizationId;

      // Check ALL permissions
      if (options.all && options.all.length > 0) {
        for (const key of options.all) {
          const hasPermission = await this.permissionEvaluator.evaluate(
            userId,
            key,
            scopeType,
            scopeId,
          );
          if (!hasPermission) {
            return false;
          }
        }
      }

      // Check ANY permissions
      if (options.any && options.any.length > 0) {
        let hasAny = false;
        for (const key of options.any) {
          const hasPermission = await this.permissionEvaluator.evaluate(
            userId,
            key,
            scopeType,
            scopeId,
          );
          if (hasPermission) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) {
          return false;
        }
      }

      // Check NONE permissions
      if (options.none && options.none.length > 0) {
        for (const key of options.none) {
          const hasPermission = await this.permissionEvaluator.evaluate(
            userId,
            key,
            scopeType,
            scopeId,
          );
          if (hasPermission) {
            return false; // User has a forbidden permission
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to check complex permissions for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user is admin (has article.update permission)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.permissionEvaluator.evaluate(userId, 'article.update');
  }

  /**
   * Check if user is regular user (not admin)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isRegularUser(userId: string): Promise<boolean> {
    return !(await this.isAdmin(userId));
  }

  /**
   * Check if user can manage content (create + edit)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async canManageContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      all: ['article.create'],
      any: ['article.update', 'article.update'],
    });
  }

  /**
   * Check if user can moderate content
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async canModerateContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      any: ['article.update', 'report.update'],
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
    // Use permission evaluator directly for better performance
    return (
      (await this.permissionEvaluator.evaluate(
        userId,
        'organization.update',
        'organization',
        organizationId,
      )) &&
      !(await this.permissionEvaluator.evaluate(
        userId,
        'organization.delete',
        'organization',
        organizationId,
      ))
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
    const effective = await this.permissionEvaluator.getEffectivePermissions(
      userId,
      organizationId ? 'organization' : undefined,
      organizationId,
    );
    return effective.allowPermissions;
  }

  /**
   * Get user effective permissions
   * @param userId - User ID
   * @param organizationId - Optional organization context
   * @returns Promise<EffectivePermissions>
   */
  async getUserEffectivePermissions(
    userId: string,
    organizationId?: string,
  ): Promise<EffectivePermissions> {
    return this.permissionEvaluator.getEffectivePermissions(
      userId,
      organizationId ? 'organization' : undefined,
      organizationId,
    );
  }
}
