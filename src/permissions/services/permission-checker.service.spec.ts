import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionKey } from '../types/permission-key.type';
import { PermissionChecker } from './permission-checker.service';
import { PermissionEvaluator } from './permission-evaluator.service';

/**
 * Unit tests for PermissionChecker service
 * Tests high-performance permission checking with caching
 */
describe('PermissionChecker', () => {
  let service: PermissionChecker;
  let permissionEvaluator: PermissionEvaluator;
  let logger: Logger;

  // Mock PermissionEvaluator
  const mockPermissionEvaluator = {
    evaluate: jest.fn(),
    getEffectivePermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionChecker,
        {
          provide: PermissionEvaluator,
          useValue: mockPermissionEvaluator,
        },
      ],
    }).compile();

    service = module.get<PermissionChecker>(PermissionChecker);
    permissionEvaluator = module.get<PermissionEvaluator>(PermissionEvaluator);
    logger = service['logger'];

    // Mock the logger methods
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        userId,
        permissionKey,
        undefined,
        undefined,
      );
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKey: PermissionKey = 'article.create';
      const error = new Error('Permission check failed');

      mockPermissionEvaluator.evaluate.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasPermission(userId, permissionKey);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check permission ${permissionKey} for user ${userId}`,
        error,
      );
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has ALL required permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = [
        'article.create',
        'article.update',
      ];
      const organizationId = 'org-456';

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // article.create
        .mockResolvedValueOnce(true); // article.update

      // Act
      const result = await service.hasAllPermissions(
        userId,
        permissionKeys,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledTimes(2);
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        userId,
        'article.create',
        'organization',
        organizationId,
      );
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        userId,
        'article.update',
        'organization',
        organizationId,
      );
    });

    it('should return false when user is missing one permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = [
        'article.create',
        'article.update',
      ];

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // article.create
        .mockResolvedValueOnce(false); // article.update - missing

      // Act
      const result = await service.hasAllPermissions(userId, permissionKeys);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = ['article.create'];
      const error = new Error('Permission check failed');

      mockPermissionEvaluator.evaluate.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasAllPermissions(userId, permissionKeys);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check all permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = [
        'article.create',
        'article.update',
      ];

      mockPermissionEvaluator.evaluate.mockResolvedValueOnce(true); // article.create - has it

      // Act
      const result = await service.hasAnyPermission(userId, permissionKeys);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = [
        'article.create',
        'article.update',
      ];

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(false) // article.create
        .mockResolvedValueOnce(false); // article.update

      // Act
      const result = await service.hasAnyPermission(userId, permissionKeys);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = ['article.create'];
      const error = new Error('Permission check failed');

      mockPermissionEvaluator.evaluate.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasAnyPermission(userId, permissionKeys);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check any permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('hasNonePermissions', () => {
    it('should return true when user has none of the forbidden permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = [
        'article.delete',
        'organization.delete',
      ];

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(false) // article.delete
        .mockResolvedValueOnce(false); // organization.delete

      // Act
      const result = await service.hasNonePermissions(userId, permissionKeys);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has at least one forbidden permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = [
        'article.delete',
        'organization.delete',
      ];

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(false) // article.delete
        .mockResolvedValueOnce(true); // organization.delete - has it

      // Act
      const result = await service.hasNonePermissions(userId, permissionKeys);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionKeys: PermissionKey[] = ['article.delete'];
      const error = new Error('Permission check failed');

      mockPermissionEvaluator.evaluate.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasNonePermissions(userId, permissionKeys);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check none permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('checkPermissions', () => {
    it('should check complex permission logic with ALL + ANY + NONE', async () => {
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
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        userId,
        'article.create',
        'organization',
        organizationId,
      );
    });

    it('should return false when ALL condition is not met', async () => {
      // Arrange
      const userId = 'user-123';
      const options = {
        all: ['article.create', 'article.update'] as PermissionKey[],
      };

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // article.create
        .mockResolvedValueOnce(false); // article.update - missing

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when ANY condition is not met', async () => {
      // Arrange
      const userId = 'user-123';
      const options = {
        any: ['article.create', 'article.update'] as PermissionKey[],
      };

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(false) // article.create
        .mockResolvedValueOnce(false); // article.update

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when NONE condition is not met', async () => {
      // Arrange
      const userId = 'user-123';
      const options = {
        none: ['article.delete'] as PermissionKey[],
      };

      mockPermissionEvaluator.evaluate.mockResolvedValueOnce(true); // Has forbidden permission

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const options = { all: ['article.create'] as PermissionKey[] };
      const error = new Error('Permission check failed');

      mockPermissionEvaluator.evaluate.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check complex permissions for user ${userId}`,
        error,
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
        expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
          userId,
          'organization.update',
          'organization',
          organizationId,
        );
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

  describe('getUserPermissions', () => {
    it('should return user permissions as bitfield', async () => {
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

      // Act
      const result = await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(result).toBe(123n);
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should return user effective permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 123n,
        denyPermissions: 0n,
        permissions: { 'article.create': true },
        permissionDetails: { 'article.create': 'allow' },
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );

      // Act
      const result = await service.getUserEffectivePermissions(
        userId,
        organizationId,
      );

      // Assert
      expect(result).toEqual(effectivePermissions);
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle content creator permissions', async () => {
      // Arrange
      const userId = 'creator-123';

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // canManageContent: article.create
        .mockResolvedValueOnce(true) // canManageContent: article.update (any)
        .mockResolvedValueOnce(false) // isRegularUser: no admin
        .mockResolvedValueOnce(false); // isAdmin: no article.update

      // Act & Assert
      expect(await service.canManageContent(userId)).toBe(true);
      expect(await service.isRegularUser(userId)).toBe(false); // Would need proper mock
      expect(await service.isAdmin(userId)).toBe(false);
    });

    it('should handle moderator permissions', async () => {
      // Arrange
      const userId = 'moderator-123';

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // canModerateContent
        .mockResolvedValueOnce(false) // isRegularUser
        .mockResolvedValueOnce(false); // isAdmin

      // Act & Assert
      expect(await service.canModerateContent(userId)).toBe(true);
      expect(await service.isRegularUser(userId)).toBe(false);
      expect(await service.isAdmin(userId)).toBe(false);
    });

    it('should handle admin permissions', async () => {
      // Arrange
      const userId = 'admin-123';

      mockPermissionEvaluator.evaluate.mockResolvedValue(true); // isAdmin

      // Act & Assert
      expect(await service.isAdmin(userId)).toBe(true);
      expect(await service.isRegularUser(userId)).toBe(false);
    });

    it('should handle organization manager permissions', async () => {
      // Arrange
      const userId = 'manager-123';
      const organizationId = 'org-456';

      mockPermissionEvaluator.evaluate
        .mockResolvedValueOnce(true) // organization.update
        .mockResolvedValueOnce(false) // organization.delete (should not have)
        .mockResolvedValueOnce(false) // isRegularUser
        .mockResolvedValueOnce(false); // isAdmin

      // Act & Assert
      expect(await service.canManageOrganization(userId, organizationId)).toBe(
        true,
      );
      expect(await service.isRegularUser(userId)).toBe(false);
      expect(await service.isAdmin(userId)).toBe(false);
    });
  });
});
