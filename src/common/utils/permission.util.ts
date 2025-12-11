import {
  DEFAULT_ROLE_PERMISSIONS_BITFIELD,
  PERMISSION_CONSTANTS,
  PermissionBitfield,
  PermissionName,
} from 'src/shared/constants';

/**
 * Permission utility functions for Discord-style bitfield operations (v1)
 * @deprecated This file contains v1 permission utilities using PermissionName
 * DO NOT USE IN NEW CODE - Use PermissionKey format and PermissionEvaluator instead
 * This file is kept for backward compatibility only and will be removed in a future version
 *
 * Provides functions for:
 * - Bitwise operations on permission bitfields
 * - Converting between permission names and bits
 * - Calculating effective permissions
 * - Permission checking and validation
 */

/**
 * Convert permission name to bitfield
 * @param permission - Permission name (e.g., 'ARTICLE_CREATE')
 * @returns Permission bitfield
 */
export function permissionToBit(
  permission: PermissionName,
): PermissionBitfield {
  return PERMISSION_CONSTANTS.BIT_MASKS[permission] || 0n;
}

/**
 * Convert array of permission names to combined bitfield
 * @param permissions - Array of permission names
 * @returns Combined permission bitfield
 */
export function permissionsToBitfield(
  permissions: PermissionName[],
): PermissionBitfield {
  return permissions.reduce((acc, perm) => acc | permissionToBit(perm), 0n);
}

/**
 * Convert bitfield to array of permission names
 * @param bitfield - Permission bitfield
 * @returns Array of permission names
 */
export function bitfieldToPermissions(
  bitfield: PermissionBitfield,
): PermissionName[] {
  const permissions: PermissionName[] = [];

  for (const permName of PERMISSION_CONSTANTS.ALL_PERMISSIONS) {
    const bit = permissionToBit(permName);
    if ((bitfield & bit) === bit) {
      permissions.push(permName);
    }
  }

  return permissions;
}

/**
 * Check if a bitfield has a specific permission
 * @param bitfield - Permission bitfield
 * @param permission - Permission name to check
 * @returns True if permission is granted
 */
export function hasPermission(
  bitfield: PermissionBitfield,
  permission: PermissionName,
): boolean {
  const bit = permissionToBit(permission);
  return (bitfield & bit) === bit;
}

/**
 * Check if a bitfield has administrator-level permissions
 * Administrator is defined as having ARTICLE_MANAGE_ALL permission
 * which grants full content management capabilities
 * @param bitfield - Permission bitfield
 * @returns True if has administrator-level permissions
 */
export function hasAdministrator(bitfield: PermissionBitfield): boolean {
  return hasPermission(bitfield, 'ARTICLE_MANAGE_ALL');
}

/**
 * Add a permission to a bitfield
 * @param bitfield - Original permission bitfield
 * @param permission - Permission to add
 * @returns Updated permission bitfield
 */
export function addPermission(
  bitfield: PermissionBitfield,
  permission: PermissionName,
): PermissionBitfield {
  const bit = permissionToBit(permission);
  return bitfield | bit;
}

/**
 * Remove a permission from a bitfield
 * @param bitfield - Original permission bitfield
 * @param permission - Permission to remove
 * @returns Updated permission bitfield
 */
export function removePermission(
  bitfield: PermissionBitfield,
  permission: PermissionName,
): PermissionBitfield {
  const bit = permissionToBit(permission);
  return bitfield & ~bit;
}

/**
 * Calculate effective permissions using Discord's algorithm
 * @param basePermissions - Base permissions from roles
 * @param everyoneAllow - Allow overwrites for @everyone
 * @param everyoneDeny - Deny overwrites for @everyone
 * @param roleAllow - Allow overwrites for user's roles
 * @param roleDeny - Deny overwrites for user's roles
 * @param memberAllow - Allow overwrites for specific member
 * @param memberDeny - Deny overwrites for specific member
 * @returns Effective permission bitfield
 */
export function calculateEffectivePermissions(
  basePermissions: PermissionBitfield,
  everyoneAllow: PermissionBitfield = 0n,
  everyoneDeny: PermissionBitfield = 0n,
  roleAllow: PermissionBitfield = 0n,
  roleDeny: PermissionBitfield = 0n,
  memberAllow: PermissionBitfield = 0n,
  memberDeny: PermissionBitfield = 0n,
): PermissionBitfield {
  // Administrator (ARTICLE_MANAGE_ALL) bypasses all overwrites
  // Return all available permissions if administrator permission is present
  if (hasAdministrator(basePermissions)) {
    // Return all permissions (all bits set)
    return ~0n;
  }

  let effectivePermissions = basePermissions;

  // Apply @everyone overwrites first
  effectivePermissions = (effectivePermissions & ~everyoneDeny) | everyoneAllow;

  // Apply role overwrites (deny first, then allow)
  effectivePermissions = (effectivePermissions & ~roleDeny) | roleAllow;

  // Apply member overwrites last (overrides role overwrites)
  effectivePermissions = (effectivePermissions & ~memberDeny) | memberAllow;

  return effectivePermissions;
}

/**
 * Get default permissions for an organization role
 * @param role - Organization role
 * @returns Default permission bitfield for the role
 */
export function getDefaultRolePermissions(
  role: 'owner' | 'admin' | 'member',
): PermissionBitfield {
  return (
    (DEFAULT_ROLE_PERMISSIONS_BITFIELD as Record<string, PermissionBitfield>)[
      role
    ] || 0n
  );
}

/**
 * Check if a permission requires organization context
 * @param permission - Permission name
 * @returns True if permission requires organization context
 */
export function requiresOrganizationContext(
  permission: PermissionName,
): boolean {
  // Organization-specific permissions
  const orgPermissions = [
    'ORGANIZATION_MANAGE_MEMBERS',
    'ORGANIZATION_MANAGE_SETTINGS',
    'ORGANIZATION_DELETE',
    'ORGANIZATION_VIEW_ANALYTICS',
    'ORGANIZATION_INVITE_MEMBERS',
  ];

  return orgPermissions.includes(permission);
}

/**
 * Get all permissions that require organization context
 * @returns Array of permission names that require organization context
 */
export function getOrganizationRequiredPermissions(): PermissionName[] {
  return [
    'ORGANIZATION_MANAGE_MEMBERS',
    'ORGANIZATION_MANAGE_SETTINGS',
    'ORGANIZATION_DELETE',
    'ORGANIZATION_VIEW_ANALYTICS',
    'ORGANIZATION_INVITE_MEMBERS',
  ];
}

/**
 * Format permission bitfield as a human-readable string
 * @param bitfield - Permission bitfield
 * @param separator - Separator between permissions (default: ', ')
 * @returns Formatted permission string
 */
export function formatPermissions(
  bitfield: PermissionBitfield,
  separator = ', ',
): string {
  const permissions = bitfieldToPermissions(bitfield);
  return permissions.join(separator);
}

/**
 * Create a permission overwrite object for Discord-style overwrites
 * @param allow - Allow bitfield
 * @param deny - Deny bitfield
 * @returns Overwrite object
 */
export function createOverwrite(
  allow: PermissionBitfield = 0n,
  deny: PermissionBitfield = 0n,
) {
  return { allow, deny };
}

/**
 * Merge multiple overwrites using Discord's algorithm
 * @param overwrites - Array of overwrite objects
 * @returns Merged allow and deny bitfields
 */
export function mergeOverwrites(
  overwrites: Array<{ allow: PermissionBitfield; deny: PermissionBitfield }>,
) {
  let totalAllow = 0n;
  let totalDeny = 0n;

  for (const overwrite of overwrites) {
    totalAllow |= overwrite.allow;
    totalDeny |= overwrite.deny;
  }

  return { allow: totalAllow, deny: totalDeny };
}

/**
 * Validate if a permission name exists
 * @param permission - Permission name to validate
 * @returns True if permission exists
 */
export function isValidPermission(
  permission: string,
): permission is PermissionName {
  return PERMISSION_CONSTANTS.ALL_PERMISSIONS.includes(
    permission as PermissionName,
  );
}

/**
 * Check if user has ALL of the specified permissions (AND operation)
 * @param bitfield - User's permission bitfield
 * @param permissions - Array of permissions that ALL must be present
 * @returns True if user has ALL specified permissions
 * @example
 * // User must have both ARTICLE_CREATE AND ARTICLE_PUBLISH
 * hasAllPermissions(userPerms, ['ARTICLE_CREATE', 'ARTICLE_PUBLISH'])
 */
export function hasAllPermissions(
  bitfield: PermissionBitfield,
  permissions: PermissionName[],
): boolean {
  // Convert permission names to combined bitfield
  const requiredBits = permissionsToBitfield(permissions);

  // Check if ALL bits are set (AND operation)
  return (bitfield & requiredBits) === requiredBits;
}

/**
 * Check if user has ANY of the specified permissions (OR operation)
 * @param bitfield - User's permission bitfield
 * @param permissions - Array of permissions where ANY can be present
 * @returns True if user has AT LEAST ONE specified permission
 * @example
 * // User must have either ARTICLE_EDIT_OWN OR ARTICLE_EDIT_ALL
 * hasAnyPermission(userPerms, ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL'])
 */
export function hasAnyPermission(
  bitfield: PermissionBitfield,
  permissions: PermissionName[],
): boolean {
  // Convert permission names to combined bitfield
  const requiredBits = permissionsToBitfield(permissions);

  // Check if ANY bit is set (OR operation)
  return (bitfield & requiredBits) !== 0n;
}

/**
 * Check if user has NONE of the specified permissions (NOT operation)
 * @param bitfield - User's permission bitfield
 * @param permissions - Array of permissions that must NOT be present
 * @returns True if user has NONE of the specified permissions
 * @example
 * // User must NOT have ADMINISTRATOR or BAN_MEMBERS
 * hasNonePermissions(userPerms, ['ADMINISTRATOR', 'BAN_MEMBERS'])
 */
export function hasNonePermissions(
  bitfield: PermissionBitfield,
  permissions: PermissionName[],
): boolean {
  // Convert permission names to combined bitfield
  const forbiddenBits = permissionsToBitfield(permissions);

  // Check if NO bits are set (NOT operation)
  return (bitfield & forbiddenBits) === 0n;
}

/**
 * Add multiple permissions to a bitfield (OR operation)
 * @param bitfield - Original permission bitfield
 * @param permissions - Array of permissions to add
 * @returns Updated permission bitfield with all permissions added
 * @example
 * addPermissions(userPerms, ['ARTICLE_CREATE', 'ARTICLE_EDIT_OWN', 'COMMENT_CREATE'])
 */
export function addPermissions(
  bitfield: PermissionBitfield,
  permissions: PermissionName[],
): PermissionBitfield {
  // Convert permissions to bitfield and OR with existing
  const permissionsToAdd = permissionsToBitfield(permissions);
  return bitfield | permissionsToAdd;
}

/**
 * Remove multiple permissions from a bitfield (AND NOT operation)
 * @param bitfield - Original permission bitfield
 * @param permissions - Array of permissions to remove
 * @returns Updated permission bitfield with all permissions removed
 * @example
 * removePermissions(userPerms, ['ARTICLE_DELETE_ALL', 'BAN_MEMBERS'])
 */
export function removePermissions(
  bitfield: PermissionBitfield,
  permissions: PermissionName[],
): PermissionBitfield {
  // Convert permissions to bitfield and AND with NOT
  const permissionsToRemove = permissionsToBitfield(permissions);
  return bitfield & ~permissionsToRemove;
}

/**
 * Get the difference between two permission bitfields
 * Returns permissions that exist in first but not in second
 * @param bitfield1 - First permission bitfield
 * @param bitfield2 - Second permission bitfield
 * @returns Permissions that exist in first but not in second
 * @example
 * // Get permissions that admin has but member doesn't
 * const difference = getPermissionDifference(adminPerms, memberPerms)
 */
export function getPermissionDifference(
  bitfield1: PermissionBitfield,
  bitfield2: PermissionBitfield,
): PermissionBitfield {
  // Permissions in first but not in second
  return bitfield1 & ~bitfield2;
}

/**
 * Get the intersection of two permission bitfields
 * Returns permissions that exist in both bitfields
 * @param bitfield1 - First permission bitfield
 * @param bitfield2 - Second permission bitfield
 * @returns Permissions that exist in both bitfields
 * @example
 * // Get permissions that both admin and moderator have
 * const common = getPermissionIntersection(adminPerms, moderatorPerms)
 */
export function getPermissionIntersection(
  bitfield1: PermissionBitfield,
  bitfield2: PermissionBitfield,
): PermissionBitfield {
  // Permissions that exist in both
  return bitfield1 & bitfield2;
}

/**
 * Get the union of two permission bitfields
 * Returns all permissions from both bitfields
 * @param bitfield1 - First permission bitfield
 * @param bitfield2 - Second permission bitfield
 * @returns All permissions from both bitfields
 * @example
 * // Combine permissions from two roles
 * const combined = getPermissionUnion(role1Perms, role2Perms)
 */
export function getPermissionUnion(
  bitfield1: PermissionBitfield,
  bitfield2: PermissionBitfield,
): PermissionBitfield {
  // All permissions from both
  return bitfield1 | bitfield2;
}

/**
 * Toggle a permission in a bitfield
 * If permission exists, remove it. If not, add it.
 * @param bitfield - Original permission bitfield
 * @param permission - Permission to toggle
 * @returns Updated permission bitfield
 * @example
 * togglePermission(userPerms, 'ARTICLE_CREATE')
 */
export function togglePermission(
  bitfield: PermissionBitfield,
  permission: PermissionName,
): PermissionBitfield {
  const bit = permissionToBit(permission);
  return bitfield ^ bit; // XOR to toggle
}

/**
 * Complex permission check with AND/OR/NOT logic
 * @param bitfield - User's permission bitfield
 * @param options - Permission check options
 * @returns True if all conditions are met
 * @example
 * // User must have (ARTICLE_CREATE OR ARTICLE_EDIT_OWN) AND NOT ADMINISTRATOR
 * checkPermissions(userPerms, {
 *   any: ['ARTICLE_CREATE', 'ARTICLE_EDIT_OWN'],
 *   none: ['ADMINISTRATOR']
 * })
 */
export function checkPermissions(
  bitfield: PermissionBitfield,
  options: {
    all?: PermissionName[]; // Must have ALL of these (AND)
    any?: PermissionName[]; // Must have ANY of these (OR)
    none?: PermissionName[]; // Must have NONE of these (NOT)
  },
): boolean {
  // Check ALL condition (AND)
  if (options.all && !hasAllPermissions(bitfield, options.all)) {
    return false;
  }

  // Check ANY condition (OR)
  if (options.any && !hasAnyPermission(bitfield, options.any)) {
    return false;
  }

  // Check NONE condition (NOT)
  if (options.none && !hasNonePermissions(bitfield, options.none)) {
    return false;
  }

  return true;
}
