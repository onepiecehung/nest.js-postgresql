/**
 * Permission constants for the Social Media Platform permission system
 * @deprecated Use PermissionKeys and PermissionRegistry instead
 * These constants are kept for backward compatibility only
 * DO NOT USE IN NEW CODE - Use PermissionKey format (e.g., 'article.create') instead
 */
import { PERMISSION_CONSTANTS } from 'src/shared/constants/permission.constants';

// Re-export the existing permission constants for backward compatibility
// @deprecated Use PermissionKeys instead - This will be removed in a future version
export const PERMISSIONS = PERMISSION_CONSTANTS.BIT_MASKS;

/**
 * Default role names for the system
 */
export const DEFAULT_ROLES = {
  EVERYONE: 'everyone',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  OWNER: 'owner',
  UPLOADER: 'uploader',
} as const;

/**
 * Legacy permission calculation result interface
 * @deprecated Use EffectivePermissions from interfaces/effective-permissions.interface.ts instead
 * This interface is kept for backward compatibility only
 * DO NOT USE IN NEW CODE
 */
export interface LegacyEffectivePermissions {
  /** The computed permission mask as BigInt */
  mask: bigint;
  /** Boolean map of individual permissions for easy checking */
  map: Record<string, boolean>;
}
