import {
  ALL_PERMISSION_KEYS,
  ARTICLE_CREATE,
  ARTICLE_READ,
  ARTICLE_UPDATE,
  MEDIA_CREATE,
  ORGANIZATION_READ,
  ORGANIZATION_UPDATE,
  REPORT_READ,
  REPORT_UPDATE,
  SEGMENT_CREATE,
  SEGMENT_UPDATE,
  SERIES_CREATE,
  SERIES_UPDATE,
  STICKER_CREATE,
  STICKER_DELETE,
  STICKER_READ,
  STICKER_UPDATE,
} from 'src/permissions/constants/permission-keys.constants';
import { DEFAULT_ROLES } from 'src/permissions/constants/permissions.constants';
import { Role } from 'src/permissions/entities/role.entity';
import { PermissionKey } from 'src/permissions/types/permission-key.type';
import { DataSource } from 'typeorm';

// Helper to calculate bitmask from PermissionKeys
// This mimics what PermissionRegistry does but works in seed context
function calculateBitmask(keys: PermissionKey[]): bigint {
  // PermissionKeys are registered sequentially starting from bit 0
  // Use ALL_PERMISSION_KEYS to get the correct bit index
  let bitmask = 0n;
  for (const key of keys) {
    const bitIndex = ALL_PERMISSION_KEYS.indexOf(key);
    if (bitIndex >= 0) {
      bitmask |= 1n << BigInt(bitIndex);
    }
  }
  return bitmask;
}

/**
 * Seed script for creating default roles in the permissions system
 * Creates the standard Discord-style roles: everyone, member, moderator, admin, owner
 */
export async function seedPermissions(dataSource: DataSource): Promise<void> {
  console.log('🌱 Seeding permissions system...');

  const roleRepository = dataSource.getRepository(Role);

  // Check if roles already exist
  const existingRoles = await roleRepository.count();
  if (existingRoles > 0) {
    console.log('✅ Permissions already seeded, skipping...');
    return;
  }

  // Calculate permissions using PermissionKeys
  const moderatorPerms = calculateModeratorPermissions();
  const adminPerms = calculateAdminPermissions();
  const uploaderPerms = calculateUploaderPermissions();

  // Create roles individually to trigger entity hooks (IDs, timestamps)
  const rolesToCreate: Array<Partial<Role>> = [
    {
      name: DEFAULT_ROLES.EVERYONE,
      description: 'Default role assigned to all users',
      allowPermissions: '0',
      denyPermissions: '0',
      position: 0,
      mentionable: false,
      managed: false,
    },
    {
      name: DEFAULT_ROLES.MEMBER,
      description: 'Default role for server members',
      allowPermissions: '0',
      denyPermissions: '0',
      position: 1,
      mentionable: false,
      managed: false,
    },
    {
      name: DEFAULT_ROLES.MODERATOR,
      description: 'Server moderators with moderation permissions',
      allowPermissions: moderatorPerms.toString(),
      denyPermissions: '0',
      position: 2,
      mentionable: true,
      managed: false,
      color: '#ff7f00',
    },
    {
      name: DEFAULT_ROLES.ADMIN,
      description: 'Server administrators with administrative permissions',
      allowPermissions: adminPerms.toString(),
      denyPermissions: '0',
      position: 3,
      mentionable: true,
      managed: false,
      color: '#ff0000',
    },
    {
      name: DEFAULT_ROLES.OWNER,
      description: 'Server owner with full permissions',
      allowPermissions: (~0n).toString(), // All permissions
      denyPermissions: '0',
      position: 4,
      mentionable: true,
      managed: false,
      color: '#ffff00',
    },
    {
      name: DEFAULT_ROLES.UPLOADER,
      description: 'Server uploaders with upload permissions',
      allowPermissions: uploaderPerms.toString(),
      denyPermissions: '0',
      position: 5,
      mentionable: true,
      managed: false,
      color: '#00ff00',
    },
  ];

  const createdRoles: Role[] = [];
  for (const data of rolesToCreate) {
    // Double-check existing by unique name
    const existing = await roleRepository.findOne({
      where: { name: data.name },
    });
    if (existing) {
      console.log(`ℹ️  Role already exists: ${existing.name}`);
      continue;
    }
    const role = roleRepository.create(data);
    const saved = await roleRepository.save(role);
    createdRoles.push(saved);
    console.log(`✅ Created role: ${saved.name} (ID: ${saved.id})`);
  }

  console.log(
    `🎉 Permissions seeding completed! (${createdRoles.length} roles)`,
  );
}

/**
 * Calculate permissions for moderator role using PermissionKeys
 * Moderators can read and moderate content, but cannot manage all articles
 */
function calculateModeratorPermissions(): bigint {
  const permissionKeys: PermissionKey[] = [
    ARTICLE_READ,
    ARTICLE_UPDATE,
    SERIES_UPDATE,
    MEDIA_CREATE,
    STICKER_READ,
    REPORT_READ,
    REPORT_UPDATE,
  ];
  return calculateBitmask(permissionKeys);
}

/**
 * Calculate permissions for admin role using PermissionKeys
 * Admins have most permissions but not full owner access
 */
function calculateAdminPermissions(): bigint {
  const permissionKeys: PermissionKey[] = [
    // Moderator permissions
    ARTICLE_READ,
    ARTICLE_UPDATE,
    SERIES_UPDATE,
    MEDIA_CREATE,
    STICKER_READ,
    REPORT_READ,
    REPORT_UPDATE,
    // Admin additional permissions
    ARTICLE_CREATE,
    SERIES_CREATE,
    SEGMENT_CREATE,
    SEGMENT_UPDATE,
    STICKER_CREATE,
    STICKER_UPDATE,
    STICKER_DELETE,
    ORGANIZATION_UPDATE,
    ORGANIZATION_READ,
  ];
  return calculateBitmask(permissionKeys);
}

/**
 * Calculate permissions for uploader role using PermissionKeys
 * Uploaders can create and update segments
 */
function calculateUploaderPermissions(): bigint {
  const permissionKeys: PermissionKey[] = [SEGMENT_CREATE, SEGMENT_UPDATE];
  return calculateBitmask(permissionKeys);
}
