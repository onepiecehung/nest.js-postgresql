// Staff Entity Constants
export const STAFF_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 5000,
  LANGUAGE_MAX_LENGTH: 50,
  GENDER_MAX_LENGTH: 50,
  OCCUPATION_MAX_LENGTH: 100,
  HOME_TOWN_MAX_LENGTH: 255,
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
export type StaffStatus =
  (typeof STAFF_CONSTANTS.STATUS)[keyof typeof STAFF_CONSTANTS.STATUS];

export type StaffGender =
  (typeof STAFF_CONSTANTS.GENDER)[keyof typeof STAFF_CONSTANTS.GENDER];

export type BloodType =
  (typeof STAFF_CONSTANTS.BLOOD_TYPES)[keyof typeof STAFF_CONSTANTS.BLOOD_TYPES];
