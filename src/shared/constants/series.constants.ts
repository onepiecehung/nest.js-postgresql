// Series (Media) Entity Constants
// Based on AniList API Media object: https://docs.anilist.co/reference/object/media
export const SERIES_CONSTANTS = {
  // Field lengths
  TITLE_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 10000,
  HASHTAG_MAX_LENGTH: 100,
  BANNER_IMAGE_MAX_LENGTH: 512,
  SITE_URL_MAX_LENGTH: 512,
  MOD_NOTES_MAX_LENGTH: 2000,
  COUNTRY_CODE_LENGTH: 2, // ISO 3166-1 alpha-2

  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ARCHIVED: 'archived',
  },

  // Media types (Anime or Manga)
  TYPE: {
    ANIME: 'ANIME',
    MANGA: 'MANGA',
  },

  // Media formats
  FORMAT: {
    // Anime formats
    TV: 'TV',
    TV_SHORT: 'TV_SHORT',
    MOVIE: 'MOVIE',
    SPECIAL: 'SPECIAL',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'MUSIC',
    // Manga formats
    MANGA: 'MANGA',
    NOVEL: 'NOVEL',
    ONE_SHOT: 'ONE_SHOT',
  },

  // Media status (releasing status)
  RELEASING_STATUS: {
    FINISHED: 'FINISHED',
    RELEASING: 'RELEASING',
    NOT_YET_RELEASED: 'NOT_YET_RELEASED',
    CANCELLED: 'CANCELLED',
    HIATUS: 'HIATUS',
  },

  // Media source
  SOURCE: {
    ORIGINAL: 'ORIGINAL',
    MANGA: 'MANGA',
    LIGHT_NOVEL: 'LIGHT_NOVEL',
    VISUAL_NOVEL: 'VISUAL_NOVEL',
    VIDEO_GAME: 'VIDEO_GAME',
    OTHER: 'OTHER',
    NOVEL: 'NOVEL',
    DOUJINSHI: 'DOUJINSHI',
    ANIME: 'ANIME',
    WEB_NOVEL: 'WEB_NOVEL',
    LIVE_ACTION: 'LIVE_ACTION',
    GAME: 'GAME',
    COMIC: 'COMIC',
    MULTIMEDIA_PROJECT: 'MULTIMEDIA_PROJECT',
    PICTURE_BOOK: 'PICTURE_BOOK',
  },

  // Media season
  SEASON: {
    WINTER: 'WINTER',
    SPRING: 'SPRING',
    SUMMER: 'SUMMER',
    FALL: 'FALL',
  },
} as const;

// Type definitions for better TypeScript support
export type SeriesStatus =
  (typeof SERIES_CONSTANTS.STATUS)[keyof typeof SERIES_CONSTANTS.STATUS];

export type SeriesType =
  (typeof SERIES_CONSTANTS.TYPE)[keyof typeof SERIES_CONSTANTS.TYPE];

export type SeriesFormat =
  (typeof SERIES_CONSTANTS.FORMAT)[keyof typeof SERIES_CONSTANTS.FORMAT];

export type SeriesReleasingStatus =
  (typeof SERIES_CONSTANTS.RELEASING_STATUS)[keyof typeof SERIES_CONSTANTS.RELEASING_STATUS];

export type SeriesSource =
  (typeof SERIES_CONSTANTS.SOURCE)[keyof typeof SERIES_CONSTANTS.SOURCE];

export type SeriesSeason =
  (typeof SERIES_CONSTANTS.SEASON)[keyof typeof SERIES_CONSTANTS.SEASON];
