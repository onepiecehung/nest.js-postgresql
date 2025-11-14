// Author Entity Constants
export const AUTHOR_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 5000,
  NATIONALITY_MAX_LENGTH: 100,
  WEBSITE_MAX_LENGTH: 512,
  SITE_URL_MAX_LENGTH: 512,
  MOD_NOTES_MAX_LENGTH: 2000,
  ROLE_MAX_LENGTH: 100,

  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ARCHIVED: 'archived',
  },

  // Author roles in series
  ROLES: {
    AUTHOR: 'author',
    STORY: 'story',
    ART: 'art',
    STORY_AND_ART: 'story_and_art',
    ORIGINAL_CREATOR: 'original_creator',
    ILLUSTRATOR: 'illustrator',
    WRITER: 'writer',
  },
} as const;

// Type definitions for better TypeScript support
export type AuthorStatus =
  (typeof AUTHOR_CONSTANTS.STATUS)[keyof typeof AUTHOR_CONSTANTS.STATUS];

export type AuthorRole =
  (typeof AUTHOR_CONSTANTS.ROLES)[keyof typeof AUTHOR_CONSTANTS.ROLES];
