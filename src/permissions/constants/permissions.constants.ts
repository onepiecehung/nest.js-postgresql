/**
 * Permission constants for the Social Media Platform permission system
 * Re-exports existing permission constants from shared constants
 */
import { PERMISSION_CONSTANTS } from 'src/shared/constants/permission.constants';

// Re-export the existing permission constants for backward compatibility
export const PERMISSIONS = PERMISSION_CONSTANTS.BIT_MASKS;

/**
 * Permission names for human-readable display
 * Maps permission constants to their string names
 * Order matches the bit positions in PERMISSION_CONSTANTS
 */
export const PERMISSION_NAMES = {
  // ==================== CONTENT MANAGEMENT ====================
  ARTICLE_CREATE: 'Create Articles',
  ARTICLE_READ: 'Read Articles',
  ARTICLE_UPDATE: 'Update Articles',
  ARTICLE_MANAGE_ALL: 'Manage All Articles',
  SERIES_CREATE: 'Create Series',
  SERIES_UPDATE: 'Update Series',
  SEGMENTS_CREATE: 'Create Segments',
  SEGMENTS_UPDATE: 'Update Segments',
  // ==================== MEDIA MANAGEMENT ====================
  MEDIA_UPLOAD: 'Upload Media',
  // ==================== ORGANIZATION MANAGEMENT ====================
  ORGANIZATION_MANAGE_MEMBERS: 'Manage Organization Members',
  ORGANIZATION_MANAGE_SETTINGS: 'Manage Organization Settings',
  ORGANIZATION_DELETE: 'Delete Organization',
  ORGANIZATION_VIEW_ANALYTICS: 'View Organization Analytics',
  ORGANIZATION_INVITE_MEMBERS: 'Invite Organization Members',
  // ==================== CONTENT DISCOVERY ====================
  STICKER_CREATE: 'Create Stickers',
  STICKER_READ: 'Read Stickers',
  STICKER_UPDATE: 'Update Stickers',
  STICKER_DELETE: 'Delete Stickers',
  // ==================== MODERATION ====================
  REPORT_READ: 'Read Reports',
  REPORT_MODERATE: 'Moderate Reports',
} as const;

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
 * Permission calculation result interface
 */
export interface EffectivePermissions {
  /** The computed permission mask as BigInt */
  mask: bigint;
  /** Boolean map of individual permissions for easy checking */
  map: Record<string, boolean>;
}
