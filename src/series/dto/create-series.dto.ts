import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SERIES_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for creating a media title
 */
export class SeriesTitleDto {
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.TITLE_MAX_LENGTH)
  romaji?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.TITLE_MAX_LENGTH)
  english?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.TITLE_MAX_LENGTH)
  native?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.TITLE_MAX_LENGTH)
  userPreferred?: string;
}

/**
 * DTO for creating a new series (media)
 * Based on AniList API Media object: https://docs.anilist.co/reference/object/media
 */
export class CreateSeriesDto {
  /**
   * The MAL id of the media
   * MyAnimeList ID for cross-reference
   */
  @IsOptional()
  @IsString()
  myAnimeListId?: string;

  /**
   * The AniList id of the media
   * AniList ID for cross-reference
   */
  @IsOptional()
  @IsString()
  aniListId?: string;

  /**
   * The official titles of the media in various languages
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => SeriesTitleDto)
  title?: SeriesTitleDto;

  /**
   * The type of the media; anime or manga
   * Required field
   */
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.TYPE))
  type: string;

  /**
   * The format the media was released in
   * Examples: TV, MOVIE, MANGA, NOVEL, etc.
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.FORMAT))
  format?: string;

  /**
   * The current releasing status of the series
   * Examples: FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.STATUS))
  status?: string;

  /**
   * Short description of the media's story and characters
   * Can be in markdown format
   */
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  /**
   * The first official release date of the media
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  /**
   * The last official release date of the media
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  /**
   * The season the media was initially released in
   * Examples: WINTER, SPRING, SUMMER, FALL
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.SEASON))
  season?: string;

  /**
   * The season year the media was initially released in
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  seasonYear?: number;

  /**
   * The year & season the media was initially released in
   * Calculated field combining seasonYear and season
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  seasonInt?: number;

  /**
   * The amount of episodes the anime has when complete
   * Only for ANIME type
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  episodes?: number;

  /**
   * The general length of each anime episode in minutes
   * Only for ANIME type
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  /**
   * The amount of chapters the manga has when complete
   * Only for MANGA type
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  chapters?: number;

  /**
   * The amount of volumes the manga has when complete
   * Only for MANGA type
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  volumes?: number;

  /**
   * Where the media was created (ISO 3166-1 alpha-2 country code)
   * Examples: JP, US, KR
   */
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.COUNTRY_CODE_LENGTH)
  countryOfOrigin?: string;

  /**
   * If the media is officially licensed or a self-published doujin release
   */
  @IsOptional()
  @IsBoolean()
  isLicensed?: boolean;

  /**
   * Source type the media was adapted from
   * Examples: ORIGINAL, MANGA, LIGHT_NOVEL, etc.
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.SOURCE))
  source?: string;

  /**
   * The ID of the cover image of the media
   */
  @IsOptional()
  @IsString()
  coverImageId?: string;

  /**
   * The ID of the banner image of the media
   */
  @IsOptional()
  @IsString()
  bannerImageId?: string;

  /**
   * Genre IDs to associate with this series
   * Array of genre IDs (bigint strings)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genreIds?: string[];

  /**
   * Tag IDs to associate with this series
   * Array of tag IDs (bigint strings)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  /**
   * Alternative titles of the media
   * Stored as JSONB array
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  /**
   * A weighted average score of all the user's scores of the media
   * Stored as double precision (can be decimal)
   */
  @IsOptional()
  @Type(() => Number)
  averageScore?: number;

  /**
   * Mean score of all the user's scores of the media
   * Stored as double precision (can be decimal)
   */
  @IsOptional()
  @Type(() => Number)
  meanScore?: number;

  /**
   * The number of users with the media on their list
   */
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  popularity?: number;

  /**
   * Locked media may not be added to lists or favorited
   */
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  /**
   * The amount of related activity in the past hour
   */
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  trending?: number;

  /**
   * If the media is intended only for 18+ NSFW audiences
   */
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  /**
   * If the media should have forum thread automatically created for it on airing episode release
   */
  @IsOptional()
  @IsBoolean()
  autoCreateForumThread?: boolean;

  /**
   * If the media is blocked from being recommended to/from
   */
  @IsOptional()
  @IsBoolean()
  isRecommendationBlocked?: boolean;

  /**
   * If the media is blocked from being reviewed
   */
  @IsOptional()
  @IsBoolean()
  isReviewBlocked?: boolean;

  /**
   * Notes for the series
   */
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.MOD_NOTES_MAX_LENGTH)
  notes?: string;

  /**
   * Series status (internal status, not releasing status)
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.RELEASING_STATUS))
  releasingStatus?: string;

  /**
   * External links to another site related to the media
   * Stored as JSONB object with site name as key and URL as value
   */
  @IsOptional()
  @IsObject()
  externalLinks?: Record<string, string>;

  /**
   * Data and links to legal streaming episodes on external sites
   * Stored as JSONB object with site name as key and URL as value
   */
  @IsOptional()
  @IsObject()
  streamingEpisodes?: Record<string, string>;

  /**
   * Additional metadata for series
   * JSON field for storing structured data
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
