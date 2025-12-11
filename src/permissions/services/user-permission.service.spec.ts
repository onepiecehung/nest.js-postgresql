import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from 'src/shared/services';
import { PermissionKey } from '../types/permission-key.type';
import { PermissionEvaluator } from './permission-evaluator.service';
import { UserPermissionService } from './user-permission.service';

/**
 * Unit tests for UserPermissionService
 * Tests high-performance permission caching with Redis
 */
describe('UserPermissionService', () => {
  let service: UserPermissionService;
  let permissionEvaluator: PermissionEvaluator;
  let cacheService: CacheService;
  let logger: Logger;

  // Mock PermissionEvaluator
  const mockPermissionEvaluator = {
    evaluate: jest.fn(),
    getEffectivePermissions: jest.fn(),
    invalidateCache: jest.fn(),
  };

  // Mock CacheService
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPermissionService,
        {
          provide: PermissionEvaluator,
          useValue: mockPermissionEvaluator,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UserPermissionService>(UserPermissionService);
    permissionEvaluator = module.get<PermissionEvaluator>(PermissionEvaluator);
    cacheService = module.get<CacheService>(CacheService);
    logger = service['logger'];

    // Mock the logger methods
    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initUserPermissions', () => {
    it('should initialize user permissions in cache successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 123n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      await service.initUserPermissions(userId, organizationId);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        '123',
        3600, // CACHE_TTL
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Initializing permissions for user ${userId}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Cached permissions for user ${userId}: 123`,
      );
    });

    it('should initialize user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      const effectivePermissions = {
        allowPermissions: 456n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      await service.initUserPermissions(userId);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, undefined, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        '456',
        3600,
      );
    });

    it('should throw error when initialization fails', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Database connection failed');

      mockPermissionEvaluator.getEffectivePermissions.mockRejectedValue(error);

      // Act & Assert
      await expect(service.initUserPermissions(userId)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to init permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return cached permissions when available', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const cachedPermissions = '123';

      mockCacheService.get.mockResolvedValue(cachedPermissions);

      // Act
      const result = await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(result).toBe(123n);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).not.toHaveBeenCalled();
    });

    it('should load from database and cache when cache miss', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 789n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockCacheService.get.mockResolvedValue(null); // Cache miss
      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(result).toBe(789n);
      expect(logger.warn).toHaveBeenCalledWith(
        `Cache miss for user ${userId}, loading from database`,
      );
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        '789',
        3600,
      );
    });

    it('should return 0n when error occurs', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Cache service unavailable');

      mockCacheService.get.mockRejectedValue(error);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBe(0n);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to get permissions for user ${userId}`,
        error,
      );
    });

    it('should handle organization context in cache key', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const cachedPermissions = '123';

      mockCacheService.get.mockResolvedValue(cachedPermissions);

      // Act
      await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
    });

    it('should handle global context in cache key', async () => {
      // Arrange
      const userId = 'user-123';
      const cachedPermissions = '456';

      mockCacheService.get.mockResolvedValue(cachedPermissions);

      // Act
      await service.getUserPermissions(userId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKey: PermissionKey = 'article.create';
      const organizationId = 'org-456';

      mockPermissionEvaluator.evaluate.mockResolvedValue(true);

      // Act
      const result = await service.hasPermission(
        userId,
        permissionKey,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        userId,
        permissionKey,
        'organization',
        organizationId,
      );
    });

    it('should return false when user does not have permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKey: PermissionKey = 'article.update';

      mockPermissionEvaluator.evaluate.mockResolvedValue(false);

      // Act
      const result = await service.hasPermission(userId, permissionKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkPermissions', () => {
    it('should check complex permission logic', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const options = {
        all: ['article.create'] as PermissionKey[],
        any: ['article.update', 'article.delete'] as PermissionKey[],
        none: ['organization.delete'] as PermissionKey[],
      };

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // all: article.create
        .mockResolvedValueOnce(true) // any: article.update (first one passes)
        .mockResolvedValueOnce(false); // none: organization.delete

      // Act
      const result = await service.checkPermissions(
        userId,
        options,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('refreshUserPermissions', () => {
    it('should refresh user permissions successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 999n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      // Act
      await service.refreshUserPermissions(userId, organizationId);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        '999',
        3600,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Refreshing permissions for user ${userId}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Refreshed permissions for user ${userId}: 999`,
      );
    });

    it('should refresh user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      const effectivePermissions = {
        allowPermissions: 111n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      // Act
      await service.refreshUserPermissions(userId);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, undefined, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        '111',
        3600,
      );
    });

    it('should throw error when refresh fails', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Database connection failed');

      mockPermissionEvaluator.getEffectivePermissions.mockRejectedValue(error);

      // Act & Assert
      await expect(service.refreshUserPermissions(userId)).rejects.toThrow(
        error,
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to refresh permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('clearUserPermissions', () => {
    it('should clear user permissions from cache successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockCacheService.delete.mockResolvedValue(undefined);

      // Act
      await service.clearUserPermissions(userId, organizationId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Cleared permissions cache for user ${userId}`,
      );
    });

    it('should clear user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';

      mockCacheService.delete.mockResolvedValue(undefined);

      // Act
      await service.clearUserPermissions(userId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });

    it('should handle cache deletion errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Cache service unavailable');

      mockCacheService.delete.mockRejectedValue(error);

      // Act
      await service.clearUserPermissions(userId);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to clear permissions for user ${userId}`,
        error,
      );
      // Should not throw error to avoid breaking logout flow
    });
  });

  describe('batchRefreshPermissions', () => {
    it('should batch refresh permissions for multiple users', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 100n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      // Act
      await service.batchRefreshPermissions(userIds, organizationId);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledTimes(3);
      expect(mockCacheService.set).toHaveBeenCalledTimes(3);
      expect(logger.log).toHaveBeenCalledWith(
        `Batch refreshed permissions for ${userIds.length} users`,
      );
    });

    it('should batch refresh permissions without organization context', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];
      const effectivePermissions = {
        allowPermissions: 200n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      // Act
      await service.batchRefreshPermissions(userIds);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledTimes(2);
      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
    });

    it('should handle empty user list', async () => {
      // Arrange
      const userIds: string[] = [];

      // Act
      await service.batchRefreshPermissions(userIds);

      // Assert
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        `Batch refreshed permissions for 0 users`,
      );
    });
  });

  describe('isCached', () => {
    it('should return true when permissions are cached', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockCacheService.exists.mockResolvedValue(true);

      // Act
      const result = await service.isCached(userId, organizationId);

      // Assert
      expect(result).toBe(true);
      expect(mockCacheService.exists).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
    });

    it('should return false when permissions are not cached', async () => {
      // Arrange
      const userId = 'user-123';

      mockCacheService.exists.mockResolvedValue(false);

      // Act
      const result = await service.isCached(userId);

      // Assert
      expect(result).toBe(false);
      expect(mockCacheService.exists).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });
  });

  describe('Convenience methods', () => {
    describe('isAdmin', () => {
      it('should return true when user has article.update permission', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValue(true);

        // Act
        const result = await service.isAdmin(userId);

        // Assert
        expect(result).toBe(true);
        expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
          userId,
          'article.update',
          undefined,
          undefined,
        );
      });

      it('should return false when user does not have article.update permission', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValue(false);

        // Act
        const result = await service.isAdmin(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('isRegularUser', () => {
      it('should return true when user has no admin permissions', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValue(false); // isAdmin returns false

        // Act
        const result = await service.isRegularUser(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user has admin permissions', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValue(true); // isAdmin returns true

        // Act
        const result = await service.isRegularUser(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('canManageContent', () => {
      it('should return true when user can manage content', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate
          .mockResolvedValueOnce(true) // all: article.create
          .mockResolvedValueOnce(true); // any: article.update

        // Act
        const result = await service.canManageContent(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot manage content', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValueOnce(false); // Missing article.create

        // Act
        const result = await service.canManageContent(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('canModerateContent', () => {
      it('should return true when user can moderate content', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValueOnce(true);

        // Act
        const result = await service.canModerateContent(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot moderate content', async () => {
        // Arrange
        const userId = 'user-123';

        mockPermissionEvaluator.evaluate.mockResolvedValueOnce(false);

        // Act
        const result = await service.canModerateContent(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('canManageOrganization', () => {
      it('should return true when user can manage organization', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';

        mockPermissionEvaluator.evaluate
          .mockResolvedValueOnce(true) // organization.update
          .mockResolvedValueOnce(false); // organization.delete (should not have)

        // Act
        const result = await service.canManageOrganization(
          userId,
          organizationId,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot manage organization', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';

        mockPermissionEvaluator.evaluate.mockResolvedValueOnce(false); // Missing organization.update

        // Act
        const result = await service.canManageOrganization(
          userId,
          organizationId,
        );

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('Cache key generation', () => {
    it('should generate correct cache key with organization context', () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      // Act
      const result = service['getCacheKey'](userId, organizationId);

      // Assert
      expect(result).toBe(`user:permissions:${userId}:org:${organizationId}`);
    });

    it('should generate correct cache key without organization context', () => {
      // Arrange
      const userId = 'user-123';

      // Act
      const result = service['getCacheKey'](userId);

      // Assert
      expect(result).toBe(`user:permissions:${userId}`);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complete user session lifecycle with caching', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 555n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('555');
      mockCacheService.delete.mockResolvedValue(undefined);
      mockPermissionEvaluator.evaluate.mockResolvedValue(true);

      // Act - Simulate complete user session
      await service.initUserPermissions(userId, organizationId);
      const cachedPermissions = await service.getUserPermissions(
        userId,
        organizationId,
      );
      const hasPermission = await service.hasPermission(
        userId,
        'article.create',
        organizationId,
      );
      await service.clearUserPermissions(userId, organizationId);

      // Assert
      expect(cachedPermissions).toBe(555n);
      expect(hasPermission).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledTimes(1); // Only during init
      expect(mockCacheService.get).toHaveBeenCalledTimes(1); // getUserPermissions
      expect(mockCacheService.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle cache miss and reload scenario', async () => {
      // Arrange
      const userId = 'user-123';
      const effectivePermissions = {
        allowPermissions: 777n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockCacheService.get.mockResolvedValueOnce(null); // Cache miss
      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBe(777n);
      expect(logger.warn).toHaveBeenCalledWith(
        `Cache miss for user ${userId}, loading from database`,
      );
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, undefined, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        '777',
        3600,
      );
    });

    it('should handle organization context switching', async () => {
      // Arrange
      const userId = 'user-123';
      const org1 = 'org-1';
      const org2 = 'org-2';
      const effectivePermissions = {
        allowPermissions: 888n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('888');
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      // Act - User switches between organizations
      await service.initUserPermissions(userId, org1);
      const permissions1 = await service.getUserPermissions(userId, org1);

      await service.initUserPermissions(userId, org2);
      const permissions2 = await service.getUserPermissions(userId, org2);

      // Assert
      expect(permissions1).toBe(888n);
      expect(permissions2).toBe(888n);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${org1}`,
        '888',
        3600,
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${org2}`,
        '888',
        3600,
      );
    });
  });
});
