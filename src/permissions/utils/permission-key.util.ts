import {
  PermissionKey,
  getAction,
  getComponent,
  isPermissionKey,
} from '../types/permission-key.type';

/**
 * PermissionKey utility functions
 */

/**
 * Validate PermissionKey format
 * @param key - PermissionKey to validate
 * @returns true if valid, false otherwise
 */
export function validatePermissionKey(key: string): key is PermissionKey {
  return isPermissionKey(key);
}

/**
 * Parse PermissionKey into component and action
 * @param key - PermissionKey to parse
 * @returns Object with component and action, or null if invalid
 */
export function parsePermissionKey(key: string): {
  component: string;
  action: string;
} | null {
  if (!isPermissionKey(key)) {
    return null;
  }

  return {
    component: getComponent(key),
    action: getAction(key),
  };
}

/**
 * Build PermissionKey from component and action
 * @param component - Permission component
 * @param action - Permission action
 * @returns PermissionKey string
 */
export function buildPermissionKey(
  component: string,
  action: string,
): PermissionKey | null {
  const key = `${component}.${action}` as PermissionKey;
  return isPermissionKey(key) ? key : null;
}

/**
 * Normalize PermissionKey (lowercase, trim)
 * @param key - PermissionKey to normalize
 * @returns Normalized PermissionKey or null if invalid
 */
export function normalizePermissionKey(key: string): PermissionKey | null {
  const normalized = key.toLowerCase().trim();
  return isPermissionKey(normalized) ? normalized : null;
}

/**
 * Check if two PermissionKeys are equal (case-insensitive)
 * @param key1 - First PermissionKey
 * @param key2 - Second PermissionKey
 * @returns true if equal, false otherwise
 */
export function arePermissionKeysEqual(key1: string, key2: string): boolean {
  const normalized1 = normalizePermissionKey(key1);
  const normalized2 = normalizePermissionKey(key2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

/**
 * Get all PermissionKeys for a component
 * @param component - Permission component
 * @returns Array of PermissionKeys for the component
 */
export function getPermissionKeysForComponent(
  component: string,
): PermissionKey[] {
  const actions: Array<'create' | 'read' | 'update' | 'delete'> = [
    'create',
    'read',
    'update',
    'delete',
  ];

  return actions
    .map((action) => buildPermissionKey(component, action))
    .filter((key): key is PermissionKey => key !== null);
}
