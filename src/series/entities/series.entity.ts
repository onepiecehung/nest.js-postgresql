import { instanceToPlain } from 'class-transformer';
import { FuzzyDate } from 'src/characters/entities/character.entity';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { AuthorSeries } from 'src/authors/entities/author-series.entity';
import { SeriesCharacter } from './series-character.entity';
import { SeriesStaff } from './series-staff.entity';
import { SeriesStudio } from './series-studio.entity';

/**
 * Media Title structure
 * Stores media titles in different languages
 * Based on AniList API MediaTitle object
 */
export interface MediaTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

/**
 * Media Cover Image structure
 * Stores cover image URLs
 * Based on AniList API MediaCoverImage object
 */
export interface MediaCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string; // Average color, may be null
}

/**
 * Media Trailer structure
 * Stores trailer information
 * Based on AniList API MediaTrailer object
 */
export interface MediaTrailer {
  id?: string;
  site?: string; // youtube, dailymotion, etc.
  thumbnail?: string;
}

/**
 * Media Tag structure
 * Stores tag information
 * Based on AniList API MediaTag object
 */
export interface MediaTag {
  id?: number;
  name?: string;
  description?: string;
  category?: string;
  rank?: number;
  isGeneralSpoiler?: boolean;
  isMediaSpoiler?: boolean;
  isAdult?: boolean;
}

/**
 * Media External Link structure
 * Stores external links
 * Based on AniList API MediaExternalLink object
 */
export interface MediaExternalLink {
  id?: number;
  url?: string;
  site?: string;
}

/**
 * Media Streaming Episode structure
 * Stores streaming episode information
 * Based on AniList API MediaStreamingEpisode object
 */
export interface MediaStreamingEpisode {
  title?: string;
  thumbnail?: string;
  url?: string;
  site?: string;
}

/**
 * Media Rank structure
 * Stores ranking information
 * Based on AniList API MediaRank object
 */
export interface MediaRank {
  id?: number;
  rank?: number;
  type?: string; // RATED, POPULAR
  format?: string;
  year?: number;
  season?: string;
  allTime?: boolean;
  context?: string;
}

/**
 * Series Entity (Media)
 *
 * Represents an anime or manga series.
 * Based on AniList API Media object: https://docs.anilist.co/reference/object/media
 */
@Entity('series')
@Index(['type']) // Index for filtering by type (ANIME/MANGA)
@Index(['format']) // Index for filtering by format
@Index(['status']) // Index for filtering by releasing status
@Index(['season', 'seasonYear']) // Composite index for season filtering
export class Series extends BaseEntityCustom {
  /**
   * The MAL id of the media
   * MyAnimeList ID for cross-reference
   */
  @Index() // Index for MAL ID lookup
  @Column({ type: 'bigint', nullable: true })
  idMal?: number;

  /**
   * The official titles of the media in various languages
   * Stored as JSONB for flexible title structure
   */
  @Column({ type: 'jsonb', nullable: true })
  title?: MediaTitle;

  /**
   * The type of the media; anime or manga
   */
  @Index() // Index for filtering by type
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  type: string; // ANIME or MANGA

  /**
   * The format the media was released in
   * Examples: TV, MOVIE, MANGA, NOVEL, etc.
   */
  @Index() // Index for filtering by format
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  format?: string;

  /**
   * The current releasing status of the media
   * Examples: FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  status?: string;

  /**
   * Short description of the media's story and characters
   * Can be in markdown format
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * The first official release date of the media
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'jsonb', nullable: true })
  startDate?: FuzzyDate;

  /**
   * The last official release date of the media
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'jsonb', nullable: true })
  endDate?: FuzzyDate;

  /**
   * The season the media was initially released in
   * Examples: WINTER, SPRING, SUMMER, FALL
   */
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  season?: string;

  /**
   * The season year the media was initially released in
   */
  @Column({ type: 'int', nullable: true })
  seasonYear?: number;

  /**
   * The year & season the media was initially released in
   * Calculated field combining seasonYear and season
   */
  @Column({ type: 'int', nullable: true })
  seasonInt?: number;

  /**
   * The amount of episodes the anime has when complete
   * Only for ANIME type
   */
  @Column({ type: 'int', nullable: true })
  episodes?: number;

  /**
   * The general length of each anime episode in minutes
   * Only for ANIME type
   */
  @Column({ type: 'int', nullable: true })
  duration?: number;

  /**
   * The amount of chapters the manga has when complete
   * Only for MANGA type
   */
  @Column({ type: 'int', nullable: true })
  chapters?: number;

  /**
   * The amount of volumes the manga has when complete
   * Only for MANGA type
   */
  @Column({ type: 'int', nullable: true })
  volumes?: number;

  /**
   * Where the media was created (ISO 3166-1 alpha-2 country code)
   * Examples: JP, US, KR
   */
  @Column({
    type: 'varchar',
    length: SERIES_CONSTANTS.COUNTRY_CODE_LENGTH,
    nullable: true,
  })
  countryOfOrigin?: string;

  /**
   * If the media is officially licensed or a self-published doujin release
   */
  @Column({ type: 'boolean', nullable: true })
  isLicensed?: boolean;

  /**
   * Source type the media was adapted from
   * Examples: ORIGINAL, MANGA, LIGHT_NOVEL, etc.
   */
  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  source?: string;

  /**
   * Official Twitter hashtags for the media
   */
  @Column({
    type: 'varchar',
    length: SERIES_CONSTANTS.HASHTAG_MAX_LENGTH,
    nullable: true,
  })
  hashtag?: string;

  /**
   * Media trailer or advertisement
   * Stored as JSONB
   */
  @Column({ type: 'jsonb', nullable: true })
  trailer?: MediaTrailer;

  /**
   * The cover images of the media
   * Stored as JSONB
   */
  @Column({ type: 'jsonb', nullable: true })
  coverImage?: MediaCoverImage;

  /**
   * The banner image of the media
   */
  @Column({
    type: 'varchar',
    length: SERIES_CONSTANTS.BANNER_IMAGE_MAX_LENGTH,
    nullable: true,
  })
  bannerImage?: string;

  /**
   * The genres of the media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  genres?: string[];

  /**
   * Alternative titles of the media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  synonyms?: string[];

  /**
   * A weighted average score of all the user's scores of the media
   */
  @Index() // Index for sorting by score
  @Column({ type: 'int', nullable: true })
  averageScore?: number;

  /**
   * Mean score of all the user's scores of the media
   */
  @Column({ type: 'int', nullable: true })
  meanScore?: number;

  /**
   * The number of users with the media on their list
   */
  @Index() // Index for sorting by popularity
  @Column({ type: 'int', default: 0 })
  popularity?: number;

  /**
   * Locked media may not be added to lists or favorited
   */
  @Column({ type: 'boolean', default: false })
  isLocked?: boolean;

  /**
   * The amount of related activity in the past hour
   */
  @Index() // Index for sorting by trending
  @Column({ type: 'int', default: 0 })
  trending?: number;

  /**
   * List of tags that describes elements and themes of the media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  tags?: MediaTag[];

  /**
   * If the media is intended only for 18+ adult audiences
   */
  @Column({ type: 'boolean', default: false })
  isAdult?: boolean;

  /**
   * URL for the media page on the AniList website
   */
  @Column({
    type: 'varchar',
    length: SERIES_CONSTANTS.SITE_URL_MAX_LENGTH,
    nullable: true,
  })
  siteUrl?: string;

  /**
   * If the media should have forum thread automatically created for it on airing episode release
   */
  @Column({ type: 'boolean', default: false })
  autoCreateForumThread?: boolean;

  /**
   * If the media is blocked from being recommended to/from
   */
  @Column({ type: 'boolean', default: false })
  isRecommendationBlocked?: boolean;

  /**
   * If the media is blocked from being reviewed
   */
  @Column({ type: 'boolean', default: false })
  isReviewBlocked?: boolean;

  /**
   * Notes for site moderators
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  modNotes?: string;

  /**
   * Series status (internal status, not releasing status)
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: 20,
    default: SERIES_CONSTANTS.STATUS.ACTIVE,
  })
  seriesStatus?: string;

  /**
   * External links to another site related to the media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  externalLinks?: MediaExternalLink[];

  /**
   * Data and links to legal streaming episodes on external sites
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  streamingEpisodes?: MediaStreamingEpisode[];

  /**
   * The ranking of the media in a particular time span and format compared to other media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  rankings?: MediaRank[];

  /**
   * Additional metadata for series
   * JSON field for storing structured data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Authors who created this series
   * One-to-Many relationship with AuthorSeries junction entity
   * One series can have multiple authors
   */
  @OneToMany(() => AuthorSeries, (authorSeries) => authorSeries.series, {
    cascade: false, // Don't cascade delete author relationships when series is deleted
    eager: false, // Don't load authors by default for performance
  })
  authorRoles?: AuthorSeries[];

  /**
   * Characters in this series
   * One-to-Many relationship with SeriesCharacter junction entity
   * One series can have multiple characters with different roles
   */
  @OneToMany(
    () => SeriesCharacter,
    (seriesCharacter) => seriesCharacter.series,
    {
      cascade: false, // Don't cascade delete character relationships when series is deleted
      eager: false, // Don't load characters by default for performance
    },
  )
  characterRoles?: SeriesCharacter[];

  /**
   * Staff members who worked on this series
   * One-to-Many relationship with SeriesStaff junction entity
   * One series can have multiple staff members with different roles
   */
  @OneToMany(() => SeriesStaff, (seriesStaff) => seriesStaff.series, {
    cascade: false, // Don't cascade delete staff relationships when series is deleted
    eager: false, // Don't load staff by default for performance
  })
  staffRoles?: SeriesStaff[];

  /**
   * Studios that produced this series
   * One-to-Many relationship with SeriesStudio junction entity
   * One series can have multiple studios
   */
  @OneToMany(() => SeriesStudio, (seriesStudio) => seriesStudio.series, {
    cascade: false, // Don't cascade delete studio relationships when series is deleted
    eager: false, // Don't load studios by default for performance
  })
  studioRoles?: SeriesStudio[];

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    // Remove sensitive fields if any
    return result;
  }
}
