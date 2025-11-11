// Studio Entity Constants
export const STUDIO_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  SITE_URL_MAX_LENGTH: 512,

  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ARCHIVED: 'archived',
  },
} as const;

// Type definitions for better TypeScript support
export type StudioStatus =
  (typeof STUDIO_CONSTANTS.STATUS)[keyof typeof STUDIO_CONSTANTS.STATUS];
