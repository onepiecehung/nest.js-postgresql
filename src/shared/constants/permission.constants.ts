// Permission Constants for Social Media Platform (Bitfield-based)
export const PERMISSION_CONSTANTS = {
  // Permission bit positions (0-63 for 64-bit integer)

  // ==================== CONTENT MANAGEMENT ====================
  // Article permissions
  ARTICLE_CREATE: 0n, // Allows creating articles
  ARTICLE_READ: 1n, // Allows reading/viewing articles
  ARTICLE_UPDATE: 2n, // Allows updating articles
  ARTICLE_MANAGE_ALL: 3n, // Allows managing all articles (admin override)

  // Series permissions
  SERIES_CREATE: 4n, // Allows creating series
  SERIES_UPDATE: 5n, // Allows updating series

  // Segments permissions
  SEGMENTS_CREATE: 6n, // Allows creating segments
  SEGMENTS_UPDATE: 7n, // Allows updating segments

  // ==================== MEDIA MANAGEMENT ====================
  MEDIA_UPLOAD: 8n, // Allows uploading media files

  // ==================== ORGANIZATION MANAGEMENT ====================
  ORGANIZATION_MANAGE_MEMBERS: 9n, // Allows managing organization members
  ORGANIZATION_MANAGE_SETTINGS: 10n, // Allows managing organization settings
  ORGANIZATION_DELETE: 11n, // Allows deleting organization
  ORGANIZATION_VIEW_ANALYTICS: 12n, // Allows viewing organization analytics
  ORGANIZATION_INVITE_MEMBERS: 13n, // Allows inviting members to organization

  // ==================== CONTENT DISCOVERY ====================
  // Sticker permissions
  STICKER_CREATE: 14n, // Allows creating stickers
  STICKER_READ: 15n, // Allows reading/viewing stickers
  STICKER_UPDATE: 16n, // Allows updating stickers
  STICKER_DELETE: 17n, // Allows deleting stickers

  // ==================== MODERATION ====================
  REPORT_READ: 18n, // Allows reading/viewing reports
  REPORT_MODERATE: 19n, // Allows moderating/resolving reports

  // Permission categories for better organization
  CATEGORIES: {
    CONTENT: 'content',
    SOCIAL: 'social',
    MEDIA: 'media',
    ORGANIZATION: 'organization',
    DISCOVERY: 'discovery',
    MODERATION: 'moderation',
  },

  // All permissions as a single array for easier iteration
  ALL_PERMISSIONS: [
    // Content Management
    'ARTICLE_CREATE',
    'ARTICLE_READ',
    'ARTICLE_UPDATE',
    'ARTICLE_MANAGE_ALL',
    // Series permissions
    'SERIES_CREATE',
    'SERIES_UPDATE',
    // Segments permissions
    'SEGMENTS_CREATE',
    'SEGMENTS_UPDATE',
    // Media Management
    'MEDIA_UPLOAD',
    // Organization Management
    'ORGANIZATION_MANAGE_MEMBERS',
    'ORGANIZATION_MANAGE_SETTINGS',
    'ORGANIZATION_DELETE',
    'ORGANIZATION_VIEW_ANALYTICS',
    'ORGANIZATION_INVITE_MEMBERS',
    // Content Discovery
    'STICKER_CREATE',
    'STICKER_READ',
    'STICKER_UPDATE',
    'STICKER_DELETE',
    // Moderation
    'REPORT_READ',
    'REPORT_MODERATE',
  ],

  // Permission bit masks (pre-calculated for performance)
  BIT_MASKS: {
    // Content Management
    ARTICLE_CREATE: 1n << 0n,
    ARTICLE_READ: 1n << 1n,
    ARTICLE_UPDATE: 1n << 2n,
    ARTICLE_MANAGE_ALL: 1n << 3n,
    SERIES_CREATE: 1n << 4n,
    SERIES_UPDATE: 1n << 5n,
    SEGMENTS_CREATE: 1n << 6n,
    SEGMENTS_UPDATE: 1n << 7n,
    // Media Management
    MEDIA_UPLOAD: 1n << 8n,
    // Organization Management
    ORGANIZATION_MANAGE_MEMBERS: 1n << 9n,
    ORGANIZATION_MANAGE_SETTINGS: 1n << 10n,
    ORGANIZATION_DELETE: 1n << 11n,
    ORGANIZATION_VIEW_ANALYTICS: 1n << 12n,
    ORGANIZATION_INVITE_MEMBERS: 1n << 13n,
    // Content Discovery
    STICKER_CREATE: 1n << 14n,
    STICKER_READ: 1n << 15n,
    STICKER_UPDATE: 1n << 16n,
    STICKER_DELETE: 1n << 17n,
    // Moderation
    REPORT_READ: 1n << 18n,
    REPORT_MODERATE: 1n << 19n,
  },
} as const;

// Default permissions for each organization role (bitfield values)
export const DEFAULT_ROLE_PERMISSIONS_BITFIELD = {
  OWNER:
    // Content Management - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_MANAGE_ALL |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_UPDATE |
    // Media Management - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.MEDIA_UPLOAD |
    // Organization Management - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_MANAGE_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_MANAGE_SETTINGS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_DELETE |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_VIEW_ANALYTICS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_INVITE_MEMBERS |
    // Content Discovery - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_DELETE |
    // Moderation - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.REPORT_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.REPORT_MODERATE,
  ADMIN:
    // Content Management - Limited admin access
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_UPDATE |
    // Media Management - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.MEDIA_UPLOAD |
    // Organization Management - Limited admin access
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_MANAGE_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_VIEW_ANALYTICS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_INVITE_MEMBERS |
    // Content Discovery - Read and update
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_UPDATE |
    // Moderation - Full access
    PERMISSION_CONSTANTS.BIT_MASKS.REPORT_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.REPORT_MODERATE,
  MEMBER:
    // Content Management - Basic access
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_READ |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_UPDATE |
    // Media Management - Upload only
    PERMISSION_CONSTANTS.BIT_MASKS.MEDIA_UPLOAD |
    // Content Discovery - Read only
    PERMISSION_CONSTANTS.BIT_MASKS.STICKER_READ |
    // Moderation - No access
    0n,
} as const;

// Type definitions for better TypeScript support
export type PermissionBitfield = bigint;

export type PermissionCategory =
  (typeof PERMISSION_CONSTANTS.CATEGORIES)[keyof typeof PERMISSION_CONSTANTS.CATEGORIES];

// OrganizationMemberRole type is defined in organization.constants.ts to avoid naming conflicts

export type PermissionScope = 'global' | 'organization' | 'user';

export type PermissionOverwriteType = 'role' | 'member';

export type PermissionOverwriteAction = 'allow' | 'deny' | 'inherit';

export type PermissionAction = string;

// Helper types for easier usage
export type PermissionName =
  (typeof PERMISSION_CONSTANTS.ALL_PERMISSIONS)[number];

// Utility type to get permission bit from name
export type GetPermissionBit<T extends PermissionName> =
  (typeof PERMISSION_CONSTANTS.BIT_MASKS)[T];
