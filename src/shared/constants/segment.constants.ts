// Series Segments Entity Constants
// Based on AniList API Media object: https://docs.anilist.co/reference/object/media
export const SERIES_SEGMENT_CONSTANTS = {
  // Field lengths
  TITLE_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 10000,
  HASHTAG_MAX_LENGTH: 100,
  BANNER_IMAGE_MAX_LENGTH: 512,
  SITE_URL_MAX_LENGTH: 512,
  MOD_NOTES_MAX_LENGTH: 2000,
  COUNTRY_CODE_LENGTH: 2, // ISO 3166-1 alpha-2

  // Series segment types
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ARCHIVED: 'archived',
  },

  // Series segment types
  TYPE: {
    TRAILER: 'trailer',
    EPISODE: 'episode',
    CHAPTER: 'chapter',
  },

  // Series source
  SOURCE: {
    ORIGINAL: 'original',
    MANGA: 'manga',
    LIGHT_NOVEL: 'light_novel',
    VISUAL_NOVEL: 'visual_novel',
    VIDEO_GAME: 'video_game',
    OTHER: 'other',
    NOVEL: 'novel',
    DOUJINSHI: 'doujinshi',
    ANIME: 'anime',
    WEB_NOVEL: 'web_novel',
    LIVE_ACTION: 'live_action',
    GAME: 'game',
    COMIC: 'comic',
    MULTIMEDIA_PROJECT: 'multimedia_project',
    PICTURE_BOOK: 'picture_book',
  },

  // Series segment access type
  ACCESS_TYPE: {
    FREE: 'free',
    PAID: 'paid',
    SUBSCRIPTION: 'subscription',
    MEMBERSHIP: 'membership',
  },
} as const;

// Type definitions for better TypeScript support
export type SeriesSegmentStatus =
  (typeof SERIES_SEGMENT_CONSTANTS.STATUS)[keyof typeof SERIES_SEGMENT_CONSTANTS.STATUS];

export type SeriesSegmentType =
  (typeof SERIES_SEGMENT_CONSTANTS.TYPE)[keyof typeof SERIES_SEGMENT_CONSTANTS.TYPE];

export type SeriesSource =
  (typeof SERIES_SEGMENT_CONSTANTS.SOURCE)[keyof typeof SERIES_SEGMENT_CONSTANTS.SOURCE];

export type SeriesSegmentAccessType =
  (typeof SERIES_SEGMENT_CONSTANTS.ACCESS_TYPE)[keyof typeof SERIES_SEGMENT_CONSTANTS.ACCESS_TYPE];
