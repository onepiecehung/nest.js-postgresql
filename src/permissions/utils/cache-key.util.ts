/**
 * Cache key utilities for permissions system
 */

/**
 * Generate cache key for effective permissions
 * @param userId - User ID
 * @param scopeType - Optional scope type
 * @param scopeId - Optional scope ID
 * @returns Cache key string
 */
export function getEffectivePermissionsCacheKey(
  userId: string,
  scopeType?: string,
  scopeId?: string,
): string {
  if (scopeType && scopeId) {
    return `permissions:effective:${userId}:${scopeType}:${scopeId}`;
  }
  return `permissions:effective:${userId}:global`;
}

/**
 * Generate cache key for role permissions
 * @param roleId - Role ID
 * @returns Cache key string
 */
export function getRolePermissionsCacheKey(roleId: string): string {
  return `permissions:role:${roleId}`;
}

/**
 * Generate cache key for scope permissions
 * @param scopeType - Scope type
 * @param scopeId - Scope ID
 * @returns Cache key string
 */
export function getScopePermissionsCacheKey(
  scopeType: string,
  scopeId: string,
): string {
  return `permissions:scope:${scopeType}:${scopeId}`;
}

/**
 * Generate cache key pattern for all user effective permissions
 * @param userId - User ID
 * @returns Cache key pattern
 */
export function getUserEffectivePermissionsPattern(userId: string): string {
  return `permissions:effective:${userId}:*`;
}

/**
 * Generate cache key pattern for all scope effective permissions
 * @param scopeType - Scope type
 * @param scopeId - Scope ID
 * @returns Cache key pattern
 */
export function getScopeEffectivePermissionsPattern(
  scopeType: string,
  scopeId: string,
): string {
  return `permissions:effective:*:${scopeType}:${scopeId}`;
}
