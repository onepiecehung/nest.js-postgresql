import {
  DEFAULT_ROLES,
  PERMISSIONS,
} from 'src/permissions/constants/permissions.constants';
import { Role } from 'src/permissions/entities/role.entity';
import { DataSource } from 'typeorm';

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

  // Create roles individually to trigger entity hooks (IDs, timestamps)
  const rolesToCreate: Array<Partial<Role>> = [
    {
      name: DEFAULT_ROLES.EVERYONE,
      description: 'Default role assigned to all users',
      permissions: '0',
      position: 0,
      mentionable: false,
      managed: false,
    },
    {
      name: DEFAULT_ROLES.MEMBER,
      description: 'Default role for server members',
      permissions: '0',
      position: 1,
      mentionable: false,
      managed: false,
    },
    {
      name: DEFAULT_ROLES.MODERATOR,
      description: 'Server moderators with moderation permissions',
      permissions: calculateModeratorPermissions().toString(),
      position: 2,
      mentionable: true,
      managed: false,
      color: '#ff7f00',
    },
    {
      name: DEFAULT_ROLES.ADMIN,
      description: 'Server administrators with administrative permissions',
      permissions: calculateAdminPermissions().toString(),
      position: 3,
      mentionable: true,
      managed: false,
      color: '#ff0000',
    },
    {
      name: DEFAULT_ROLES.OWNER,
      description: 'Server owner with full permissions',
      permissions: (~0n).toString(),
      position: 4,
      mentionable: true,
      managed: false,
      color: '#ffff00',
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
 * Calculate permissions for moderator role
 * Moderators can read and moderate content, but cannot manage all articles
 */
function calculateModeratorPermissions(): bigint {
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
 * Calculate permissions for admin role
 * Admins have most permissions but not full owner access
 */
function calculateAdminPermissions(): bigint {
  return (
    calculateModeratorPermissions() |
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
