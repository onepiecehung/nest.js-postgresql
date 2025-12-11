import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/shared/services';
import { PermissionKey } from '../types/permission-key.type';
import { PermissionEvaluator } from './permission-evaluator.service';

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
    @Inject(forwardRef(() => PermissionEvaluator))
    private readonly permissionEvaluator: PermissionEvaluator,
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

      // Get fresh permissions from evaluator
      const effective = await this.permissionEvaluator.getEffectivePermissions(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );

      // Cache with different keys for different contexts
      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.set(
        cacheKey,
        effective.allowPermissions.toString(),
        this.CACHE_TTL,
      );

      this.logger.log(
        `Cached permissions for user ${userId}: ${effective.allowPermissions.toString()}`,
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
   * @deprecated Use PermissionEvaluator.getEffectivePermissions() instead
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

      // If not in cache, load from evaluator and cache it
      this.logger.warn(`Cache miss for user ${userId}, loading from database`);
      const effective = await this.permissionEvaluator.getEffectivePermissions(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );
      await this.cacheService.set(
        cacheKey,
        effective.allowPermissions.toString(),
        this.CACHE_TTL,
      );

      return effective.allowPermissions;
    } catch (error) {
      this.logger.error(`Failed to get permissions for user ${userId}`, error);
      return 0n; // Return no permissions on error
    }
  }

  /**
   * Check if user has a single permission (cached)
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param organizationId - Optional organization context
   * @returns Promise<boolean>
   */
  async hasPermission(
    userId: string,
    permissionKey: PermissionKey,
    organizationId?: string,
  ): Promise<boolean> {
    return this.permissionEvaluator.evaluate(
      userId,
      permissionKey,
      organizationId ? 'organization' : undefined,
      organizationId,
    );
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
      all?: PermissionKey[];
      any?: PermissionKey[];
      none?: PermissionKey[];
    },
    organizationId?: string,
  ): Promise<boolean> {
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
      if (!hasAny && options.any.length > 0) {
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

      // Get fresh permissions from evaluator
      const effective = await this.permissionEvaluator.getEffectivePermissions(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );

      // Update cache
      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.set(
        cacheKey,
        effective.allowPermissions.toString(),
        this.CACHE_TTL,
      );

      // Also invalidate cache to ensure consistency
      await this.permissionEvaluator.invalidateCache(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );

      this.logger.log(
        `Refreshed permissions for user ${userId}: ${effective.allowPermissions.toString()}`,
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
    // Check if user has article.update permission (admin indicator)
    return this.permissionEvaluator.evaluate(userId, 'article.update');
  }

  async isRegularUser(userId: string): Promise<boolean> {
    // Regular user doesn't have article.update
    return !(await this.isAdmin(userId));
  }

  async canManageContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      all: ['article.create'],
      any: ['article.update', 'article.update'],
    });
  }

  async canModerateContent(userId: string): Promise<boolean> {
    return this.checkPermissions(userId, {
      any: ['article.update', 'report.update'],
    });
  }

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
}
