import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PermissionsService } from 'src/permissions/permissions.service';
import { checkPermissions, hasPermission } from 'src/permissions/utils';
import { PermissionName } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

/**
 * High-performance permission service with Redis caching
 * Only loads permissions on login, then serves from cache
 */
@Injectable()
export class UserPermissionService {
  private readonly logger = new Logger(UserPermissionService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'user:permissions';

  constructor(
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Initialize user permissions in Redis (call on login)
   * @param userId - User ID
   * @param organizationId - Optional organization context
   */
  async initUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Initializing permissions for user ${userId}`);

      // Get fresh permissions from database
      const permissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);

      // Cache with different keys for different contexts
      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.set(
        cacheKey,
        permissions.toString(),
        this.CACHE_TTL,
      );

      this.logger.log(
        `Cached permissions for user ${userId}: ${permissions.toString()}`,
      );
    } catch (error) {
      this.logger.error(`Failed to init permissions for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get user permissions from Redis cache (fast)
   * @param userId - User ID
   * @param organizationId - Optional organization context
   * @returns Promise<bigint>
   */
  async getUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<bigint> {
    const cacheKey = this.getCacheKey(userId, organizationId);

    try {
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return BigInt(cached as string);
      }

      // If not in cache, load from database and cache it
      this.logger.warn(`Cache miss for user ${userId}, loading from database`);
      const permissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);
      await this.cacheService.set(
        cacheKey,
        permissions.toString(),
        this.CACHE_TTL,
      );

      return permissions;
    } catch (error) {
      this.logger.error(`Failed to get permissions for user ${userId}`, error);
      return 0n; // Return no permissions on error
    }
  }

  /**
   * Check if user has a single permission (cached)
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
    const permissions = await this.getUserPermissions(userId, organizationId);
    return hasPermission(permissions, permission);
  }

  /**
   * Check complex permissions with AND/OR/NOT logic (cached)
   * @param userId - User ID
   * @param options - Permission check options
   * @param organizationId - Optional organization context
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
    const permissions = await this.getUserPermissions(userId, organizationId);
    return checkPermissions(permissions, options);
  }

  /**
   * Update user permissions in Redis (call when permissions change)
   * @param userId - User ID
   * @param organizationId - Optional organization context
   */
  async refreshUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Refreshing permissions for user ${userId}`);

      // Get fresh permissions from database
      const permissions =
        await this.permissionsService.getUserPermissionsBitfield(userId);

      // Update cache
      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.set(
        cacheKey,
        permissions.toString(),
        this.CACHE_TTL,
      );

      this.logger.log(
        `Refreshed permissions for user ${userId}: ${permissions.toString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove user permissions from Redis (call on logout)
   * @param userId - User ID
   * @param organizationId - Optional organization context
   */
  async clearUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.delete(cacheKey);
      this.logger.log(`Cleared permissions cache for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear permissions for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Batch refresh permissions for multiple users
   * @param userIds - Array of user IDs
   * @param organizationId - Optional organization context
   */
  async batchRefreshPermissions(
    userIds: string[],
    organizationId?: string,
  ): Promise<void> {
    const promises = userIds.map((userId) =>
      this.refreshUserPermissions(userId, organizationId),
    );
    await Promise.all(promises);
    this.logger.log(`Batch refreshed permissions for ${userIds.length} users`);
  }

  /**
   * Check if user permissions are cached
   * @param userId - User ID
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async isCached(userId: string, organizationId?: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(userId, organizationId);
    return await this.cacheService.exists(cacheKey);
  }

  /**
   * Get cache key for user permissions
   * @param userId - User ID
   * @param organizationId - Optional organization context
   * @returns string
   */
  private getCacheKey(userId: string, organizationId?: string): string {
    return organizationId
      ? `${this.CACHE_PREFIX}:${userId}:org:${organizationId}`
      : `${this.CACHE_PREFIX}:${userId}`;
  }

  /**
   * Convenience methods for common permission checks
   */

  async isAdmin(userId: string): Promise<boolean> {
    // Check if user has ARTICLE_MANAGE_ALL permission (admin override)
    return this.hasPermission(userId, 'ARTICLE_MANAGE_ALL');
  }

  async isRegularUser(userId: string): Promise<boolean> {
    // Regular user doesn't have ARTICLE_MANAGE_ALL
    return !(await this.hasPermission(userId, 'ARTICLE_MANAGE_ALL'));
  }

  async canManageContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      all: ['ARTICLE_CREATE'],
      any: ['ARTICLE_UPDATE', 'ARTICLE_UPDATE'],
    });
  }

  async canModerateContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      any: ['ARTICLE_UPDATE', 'REPORT_MODERATE'],
    });
  }

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
}
