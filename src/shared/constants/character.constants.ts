// Character Entity Constants
export const CHARACTER_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 5000,
  GENDER_MAX_LENGTH: 50,
  AGE_MAX_LENGTH: 50,
  BLOOD_TYPE_MAX_LENGTH: 10,
  SITE_URL_MAX_LENGTH: 512,
  MOD_NOTES_MAX_LENGTH: 2000,

  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ARCHIVED: 'archived',
  },

  // Character roles in media
  ROLES: {
    MAIN: 'main',
    SUPPORTING: 'supporting',
    BACKGROUND: 'background',
  },

  // Gender values
  GENDER: {
    MALE: 'male',
    FEMALE: 'female',
    NON_BINARY: 'non_binary',
    OTHER: 'other',
  },

  // Blood types
  BLOOD_TYPES: {
    A: 'A',
    B: 'B',
    AB: 'AB',
    O: 'O',
  },
} as const;

// Type definitions for better TypeScript support
export type CharacterStatus =
  (typeof CHARACTER_CONSTANTS.STATUS)[keyof typeof CHARACTER_CONSTANTS.STATUS];

export type CharacterRole =
  (typeof CHARACTER_CONSTANTS.ROLES)[keyof typeof CHARACTER_CONSTANTS.ROLES];

export type CharacterGender =
  (typeof CHARACTER_CONSTANTS.GENDER)[keyof typeof CHARACTER_CONSTANTS.GENDER];

export type BloodType =
  (typeof CHARACTER_CONSTANTS.BLOOD_TYPES)[keyof typeof CHARACTER_CONSTANTS.BLOOD_TYPES];
