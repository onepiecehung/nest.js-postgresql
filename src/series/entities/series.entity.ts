import { instanceToPlain } from 'class-transformer';
import { AuthorSeries } from 'src/authors/entities/author-series.entity';
import { Character } from 'src/characters/entities/character.entity';
import { Media } from 'src/media/entities/media.entity';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { StaffSeries } from 'src/staffs/entities/staff-series.entity';
import { StudioSeries } from 'src/studios/entities/studio-series.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SeriesGenre } from './series-genre.entity';

/**
 * Media Title structure
 * Stores media titles in different languages
 * Based on AniList API MediaTitle object
 */
export interface SeriesTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

/**
 * Series Entity (Media)
 *
 * Represents an anime or manga series.
 * Based on AniList API Media object: https://docs.anilist.co/reference/object/media
 */
@Entity('series')
export class Series extends BaseEntityCustom {
  /**
   * The MAL id of the media
   * MyAnimeList ID for cross-reference
   */
  @Index() // Index for MAL ID lookup
  @Column({ type: 'varchar', nullable: true })
  myAnimeListId?: string;

  @Index() // Index for anilist ID lookup
  @Column({ type: 'varchar', nullable: true })
  aniListId?: string;

  /**
   * The official titles of the media in various languages
   * Stored as JSONB for flexible title structure
   */
  @Column({ type: 'jsonb', nullable: true })
  title?: SeriesTitle;

  /**
   * The type of the media; anime or manga
   */
  @Index() // Index for filtering by type
  @Column({
    enum: SERIES_CONSTANTS.TYPE,
    nullable: false,
  })
  type: string; // ANIME or MANGA

  /**
   * The format the media was released in
   * Examples: TV, MOVIE, MANGA, NOVEL, etc.
   */
  @Index() // Index for filtering by format
  @Column({
    enum: SERIES_CONSTANTS.FORMAT,
    nullable: true,
  })
  format?: string;

  /**
   * The current releasing status of the series
   * Examples: FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS
   */
  @Index() // Index for filtering by status
  @Column({
    enum: SERIES_CONSTANTS.STATUS,
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
  @Column({ type: 'timestamptz', nullable: true })
  startDate?: Date;

  /**
   * The last official release date of the media
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'timestamptz', nullable: true })
  endDate?: Date;

  /**
   * The season the media was initially released in
   * Examples: WINTER, SPRING, SUMMER, FALL
   */
  @Column({
    enum: SERIES_CONSTANTS.SEASON,
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
    nullable: true,
  })
  countryOfOrigin?: string;

  /**
   * If the media is officially licensed or a self-published doujin release
   */
  @Column({ type: 'boolean', nullable: true })
  isLicensed?: boolean;

  /**
   * The number of users who have favorited the media
   */
  @Column({ type: 'int', default: 0 })
  favoriteCount: number;

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
  @ManyToMany(() => Tag, (tag) => tag.series, {
    nullable: true,
    cascade: false, // Don't cascade delete tags when series is deleted
    eager: false, // Don't load tags by default for performance
  })
  @JoinTable({
    name: 'series_tags',
    joinColumn: {
      name: 'series_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id',
    },
  })
  tags?: Tag[];

  /**
   * The URLs of the cover images of the media
   */
  @Column({ type: 'jsonb', nullable: true })
  coverImageUrls?: Record<string, string>;

  /**
   * The ID of the cover image of the media
   */
  @Column({ type: 'bigint', nullable: true })
  coverImageId?: string;

  /**
   * The cover image of the media
   */
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'coverImageId', referencedColumnName: 'id' })
  coverImage: Media;

  /**
   * The URLs of the banner images of the media
   */
  @Column({ type: 'text', nullable: true })
  bannerImageUrl?: string;

  /**
   * The ID of the banner image of the media
   */
  @Column({ type: 'bigint', nullable: true })
  bannerImageId?: string;

  /**
   * The banner image of the media
   */
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'bannerImageId', referencedColumnName: 'id' })
  bannerImage: Media;

  /**
   * Genres associated with this series.
   * One-to-Many relationship with SeriesGenre junction entity.
   * One series can have multiple genres with different priorities.
   */
  @OneToMany(() => SeriesGenre, (seriesGenre) => seriesGenre.series, {
    cascade: false, // Don't cascade delete genre relationships when series is deleted
    eager: false, // Don't load genres by default for performance
  })
  genres?: SeriesGenre[];

  /**
   * Alternative titles of the media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  synonyms?: string[];

  /**
   * The trailer of the media
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  trailer?: Record<string, string>;

  /**
   * A weighted average score of all the user's scores of the media
   */
  @Index() // Index for sorting by score
  @Column({ type: 'double precision', nullable: true })
  averageScore?: number;

  /**
   * Mean score of all the user's scores of the media
   */
  @Column({ type: 'double precision', nullable: true })
  meanScore?: number;

  /**
   * The number of users with the media on their list
   */
  @Index() // Index for sorting by popularity
  @Column({ type: 'double precision', default: 0 })
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
  @Column({ type: 'double precision', default: 0 })
  trending?: number;

  /**
   * If the media is intended only for 18+ NSFW audiences
   */
  @Column({ type: 'boolean', default: false })
  isNsfw: boolean;

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
   * Notes for the series
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  /**
   * Series status (internal status, not releasing status)
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'enum',
    enum: SERIES_CONSTANTS.RELEASING_STATUS,
    nullable: true,
  })
  releasingStatus?: string;

  /**
   * External links to another site related to the media
   * Stored as JSONB object with site name as key and URL as value
   */
  @Column({ type: 'jsonb', nullable: true })
  externalLinks?: Record<string, string>;

  /**
   * Data and links to legal streaming episodes on external sites
   * Stored as JSONB object with site name as key and URL as value
   */
  @Column({ type: 'jsonb', nullable: true })
  streamingEpisodes?: Record<string, string>;
  /**
   * Additional metadata for series
   * JSON field for storing structured data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Authors who created this series.
   * One-to-Many relationship with AuthorSeries junction entity.
   * One series can be created by multiple authors with different roles.
   */
  @OneToMany(() => AuthorSeries, (authorSeries) => authorSeries.series, {
    cascade: false, // Don't cascade delete author relationships when series is deleted
    eager: false, // Don't load authors by default for performance
  })
  authorRoles?: AuthorSeries[];

  /**
   * Characters that appear in this series
   * Many-to-Many relationship with Character entity.
   * One series can have multiple characters.
   */
  @OneToMany(() => Character, (character) => character.series, {
    cascade: false, // Don't cascade delete character relationships when series is deleted
    eager: false, // Don't load characters by default for performance
  })
  characters?: Character[]; // Characters

  /**
   * Staff members who worked on this series.
   * One-to-Many relationship with StaffSeries junction entity.
   * One series can have multiple staff members with different roles.
   */
  @OneToMany(() => StaffSeries, (staffSeries) => staffSeries.series, {
    cascade: false, // Don't cascade delete staff relationships when series is deleted
    eager: false, // Don't load staff by default for performance
  })
  staffRoles?: StaffSeries[];

  /**
   * Studios that produced this series.
   * One-to-Many relationship with StudioSeries junction entity.
   * One series can be produced by multiple studios with different roles.
   */
  @OneToMany(() => StudioSeries, (studioSeries) => studioSeries.series, {
    cascade: false, // Don't cascade delete studio relationships when series is deleted
    eager: false, // Don't load studios by default for performance
  })
  studioRoles?: StudioSeries[];

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
