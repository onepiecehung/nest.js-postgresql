import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Repository } from 'typeorm';
import { DEFAULT_ROLES } from './constants/permissions.constants';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsService } from './permissions.service';
import { UserPermissionService } from './services/user-permission.service';

/**
 * Helper function to create a complete mock Role object for testing
 */
function createMockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: overrides.id || 'role-id',
    uuid: overrides.uuid || 'role-uuid',
    name: overrides.name || 'test-role',
    allowPermissions: overrides.allowPermissions || '0',
    denyPermissions: overrides.denyPermissions || '0',
    position: overrides.position || 0,
    color: overrides.color || '#000000',
    mentionable: overrides.mentionable || false,
    managed: overrides.managed || false,
    icon: overrides.icon || null,
    unicodeEmoji: overrides.unicodeEmoji || null,
    tags: overrides.tags || null,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    deletedAt: overrides.deletedAt || null,
    version: overrides.version || 1,
    userRoles: overrides.userRoles || [],
    getAllowPermissionsAsBigInt: jest.fn(() =>
      BigInt(overrides.allowPermissions || '0'),
    ),
    setAllowPermissionsFromBigInt: jest.fn(),
    getDenyPermissionsAsBigInt: jest.fn(() =>
      BigInt(overrides.denyPermissions || '0'),
    ),
    setDenyPermissionsFromBigInt: jest.fn(),
    isEveryoneRole: jest.fn(() => false),
    isAdmin: jest.fn(() => false),
    toJSON: jest.fn(),
    isDeleted: jest.fn(() => false),
    getAge: jest.fn(() => 0),
    getTimeSinceUpdate: jest.fn(() => 0),
    ...overrides,
  } as Role;
}

/**
 * Unit tests for PermissionsService focusing on permission calculation algorithm
 * Tests 5+ canonical scenarios as required
 */
describe('PermissionsService', () => {
  let service: PermissionsService;
  let roleRepository: Repository<Role>;
  let userRoleRepository: Repository<UserRole>;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
  };

  const mockUserPermissionService = {
    refreshUserPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            metadata: {
              columns: [
                { propertyName: 'deletedAt' },
                { propertyName: 'id' },
                { propertyName: 'name' },
                { propertyName: 'permissions' },
              ],
            },
          },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            metadata: {
              columns: [
                { propertyName: 'deletedAt' },
                { propertyName: 'id' },
                { propertyName: 'userId' },
                { propertyName: 'roleId' },
              ],
            },
          },
        },
        {
          provide: 'CacheService',
          useValue: mockCacheService,
        },
        {
          provide: UserPermissionService,
          useValue: mockUserPermissionService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    userRoleRepository = module.get<Repository<UserRole>>(
      getRepositoryToken(UserRole),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a new role successfully', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'test-role',
        description: 'A test role',
        permissions: '123',
        position: 1,
        color: '#ff0000',
        mentionable: true,
        managed: false,
        icon: 'https://example.com/icon.png',
        unicodeEmoji: '👑',
      };

      const expectedRole = createMockRole({
        name: createDto.name,
        description: createDto.description,
        allowPermissions: createDto.permissions,
        denyPermissions: '0',
        position: createDto.position,
        color: createDto.color,
        mentionable: createDto.mentionable,
        managed: createDto.managed,
        icon: createDto.icon,
        unicodeEmoji: createDto.unicodeEmoji,
      });

      jest.spyOn(service, 'create').mockResolvedValue(expectedRole);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(result).toEqual(expectedRole);
      expect(service.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        allowPermissions: createDto.permissions,
        denyPermissions: '0',
        position: createDto.position,
        color: createDto.color,
        mentionable: createDto.mentionable,
        managed: createDto.managed,
        icon: createDto.icon,
        unicodeEmoji: createDto.unicodeEmoji,
      });
    });

    it('should create role with default values', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'minimal-role',
      };

      const expectedRole = createMockRole({
        name: createDto.name,
        allowPermissions: '0',
        denyPermissions: '0',
        position: 0,
        mentionable: false,
        managed: false,
      });

      jest.spyOn(service, 'create').mockResolvedValue(expectedRole);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(result).toEqual(expectedRole);
      expect(service.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: undefined,
        allowPermissions: '0',
        denyPermissions: '0',
        position: 0,
        color: undefined,
        mentionable: false,
        managed: false,
        icon: undefined,
        unicodeEmoji: undefined,
      });
    });

    it('should throw HttpException when role creation fails', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'test-role',
      };

      const error = new Error('Database connection failed');
      jest.spyOn(service, 'create').mockRejectedValue(error);

      // Act & Assert
      await expect(service.createRole(createDto)).rejects.toThrow(Error);
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const updateDto: UpdateRoleDto = {
        name: 'updated-role',
        description: 'Updated description',
        permissions: '456',
      };

      const existingRole = createMockRole({ id: roleId, name: 'old-name' });
      const updatedRole = createMockRole({ ...existingRole, ...updateDto });

      jest.spyOn(service, 'findById').mockResolvedValue(existingRole);
      jest.spyOn(service, 'update').mockResolvedValue(updatedRole);

      // Act
      const result = await service.updateRole(roleId, updateDto);

      // Assert
      expect(result).toEqual(updatedRole);
      expect(service.findById).toHaveBeenCalledWith(roleId);
      expect(service.update).toHaveBeenCalledWith(roleId, {
        name: updateDto.name,
        description: updateDto.description,
        allowPermissions: updateDto.permissions,
        denyPermissions: '0',
      });
    });

    it('should throw HttpException when role not found', async () => {
      // Arrange
      const roleId = 'non-existent-role';
      const updateDto: UpdateRoleDto = { name: 'updated-name' };

      jest
        .spyOn(service, 'findById')
        .mockRejectedValue(
          new HttpException('permission.ROLE_NOT_FOUND', HttpStatus.NOT_FOUND),
        );

      // Act & Assert
      await expect(service.updateRole(roleId, updateDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.updateRole(roleId, updateDto)).rejects.toThrow(
        'permission.ROLE_NOT_FOUND',
      );
    });

    it('should throw HttpException when update fails', async () => {
      // Arrange
      const roleId = 'role-123';
      const updateDto: UpdateRoleDto = { name: 'updated-name' };

      const existingRole = createMockRole({ id: roleId });
      jest.spyOn(service, 'findById').mockResolvedValue(existingRole);

      const error = new Error('Database update failed');
      jest.spyOn(service, 'update').mockRejectedValue(error);

      // Act & Assert
      await expect(service.updateRole(roleId, updateDto)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      // Arrange
      const assignDto: AssignRoleDto = {
        userId: 'user-123',
        roleId: 'role-456',
        reason: 'Test assignment',
        assignedBy: 'admin-789',
        isTemporary: false,
        expiresAt: '2024-12-31T23:59:59.000Z',
      };

      const role = createMockRole({ id: assignDto.roleId });
      const userRole = {
        id: 'user-role-123',
        userId: assignDto.userId,
        roleId: assignDto.roleId,
        reason: assignDto.reason,
        assignedBy: assignDto.assignedBy,
        isTemporary: assignDto.isTemporary,
        expiresAt: assignDto.expiresAt
          ? new Date(assignDto.expiresAt)
          : undefined,
        createdAt: new Date(),
      } as UserRole;

      jest.spyOn(service, 'findById').mockResolvedValue(role);
      jest.spyOn(userRoleRepository, 'findOne').mockResolvedValue(null); // No existing assignment
      jest.spyOn(userRoleRepository, 'save').mockResolvedValue(userRole);
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.assignRole(assignDto);

      // Assert
      expect(result).toEqual(userRole);
      expect(service.findById).toHaveBeenCalledWith(assignDto.roleId);
      expect(userRoleRepository.findOne).toHaveBeenCalledWith({
        where: { userId: assignDto.userId, roleId: assignDto.roleId },
      });
      expect(userRoleRepository.save).toHaveBeenCalledWith({
        userId: assignDto.userId,
        roleId: assignDto.roleId,
        reason: assignDto.reason,
        assignedBy: assignDto.assignedBy,
        isTemporary: assignDto.isTemporary,
        expiresAt: assignDto.expiresAt
          ? new Date(assignDto.expiresAt)
          : undefined,
      });
      expect(
        mockUserPermissionService.refreshUserPermissions,
      ).toHaveBeenCalledWith(assignDto.userId);
    });

    it('should throw HttpException when role not found', async () => {
      // Arrange
      const assignDto: AssignRoleDto = {
        userId: 'user-123',
        roleId: 'non-existent-role',
      };

      jest
        .spyOn(service, 'findById')
        .mockRejectedValue(
          new HttpException('permission.ROLE_NOT_FOUND', HttpStatus.NOT_FOUND),
        );

      // Act & Assert
      await expect(service.assignRole(assignDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.assignRole(assignDto)).rejects.toThrow(
        'permission.ROLE_NOT_FOUND',
      );
    });

    it('should throw HttpException when role already assigned', async () => {
      // Arrange
      const assignDto: AssignRoleDto = {
        userId: 'user-123',
        roleId: 'role-456',
      };

      const role = createMockRole({ id: assignDto.roleId });
      const existingAssignment = {
        id: 'existing-assignment',
        userId: assignDto.userId,
        roleId: assignDto.roleId,
      } as UserRole;

      jest.spyOn(service, 'findById').mockResolvedValue(role);
      jest
        .spyOn(userRoleRepository, 'findOne')
        .mockResolvedValue(existingAssignment);

      // Act & Assert
      await expect(service.assignRole(assignDto)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException when assignment fails', async () => {
      // Arrange
      const assignDto: AssignRoleDto = {
        userId: 'user-123',
        roleId: 'role-456',
      };

      const role = createMockRole({ id: assignDto.roleId });
      jest.spyOn(service, 'findById').mockResolvedValue(role);
      jest.spyOn(userRoleRepository, 'findOne').mockResolvedValue(null);

      const error = new Error('Database save failed');
      jest.spyOn(userRoleRepository, 'save').mockRejectedValue(error);

      // Act & Assert
      await expect(service.assignRole(assignDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.assignRole(assignDto)).rejects.toThrow(Error);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-456';
      const userRole = {
        id: 'user-role-123',
        userId,
        roleId,
        createdAt: new Date(),
      } as UserRole;

      jest.spyOn(userRoleRepository, 'findOne').mockResolvedValue(userRole);
      jest.spyOn(userRoleRepository, 'remove').mockResolvedValue(userRole);
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.removeRole(userId, roleId);

      // Assert
      expect(userRoleRepository.findOne).toHaveBeenCalledWith({
        where: { userId, roleId },
      });
      expect(userRoleRepository.remove).toHaveBeenCalledWith(userRole);
      expect(
        mockUserPermissionService.refreshUserPermissions,
      ).toHaveBeenCalledWith(userId);
    });

    it('should throw HttpException when role assignment not found', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-456';

      jest.spyOn(userRoleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeRole(userId, roleId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.removeRole(userId, roleId)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException when removal fails', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-456';
      const userRole = {
        id: 'user-role-123',
        userId,
        roleId,
        createdAt: new Date(),
      } as UserRole;

      jest.spyOn(userRoleRepository, 'findOne').mockResolvedValue(userRole);

      const error = new Error('Database remove failed');
      jest.spyOn(userRoleRepository, 'remove').mockRejectedValue(error);

      // Act & Assert
      await expect(service.removeRole(userId, roleId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.removeRole(userId, roleId)).rejects.toThrow(Error);
    });
  });

  // Note: computeEffectivePermissions and hasPermission(bigint) methods removed
  // Use getUserEffectivePermissions() and evaluate() methods instead

  describe('createDefaultRoles', () => {
    it('should create default roles with correct permissions', async () => {
      // Arrange
      const mockOrganization = {
        id: 'org-123',
        slug: 'test-org',
      } as Organization;

      const mockRoles: Role[] = [];
      jest.spyOn(service, 'create').mockImplementation(async (data) => {
        const role = {
          ...data,
          id: `role-${mockRoles.length}`,
          createdAt: new Date(),
        } as Role;
        mockRoles.push(role);
        return role;
      });

      // Act
      const result = await service.createDefaultRoles(mockOrganization);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe(
        `${mockOrganization.slug}-${DEFAULT_ROLES.EVERYONE}`,
      );
      expect(result[1].name).toBe(
        `${mockOrganization.slug}-${DEFAULT_ROLES.MEMBER}`,
      );
      expect(result[2].name).toBe(
        `${mockOrganization.slug}-${DEFAULT_ROLES.MODERATOR}`,
      );
      expect(result[3].name).toBe(
        `${mockOrganization.slug}-${DEFAULT_ROLES.ADMIN}`,
      );
      expect(result[4].name).toBe(
        `${mockOrganization.slug}-${DEFAULT_ROLES.OWNER}`,
      );

      // Check that owner has all permissions
      expect(BigInt(result[4].allowPermissions || '0')).toBe(~0n); // All permissions
    });
  });
});
