import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { FuzzyDateDto } from 'src/characters/dto/create-character.dto';

/**
 * DTO for creating a media title
 */
export class MediaTitleDto {
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
 * DTO for creating media cover image
 */
export class MediaCoverImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.BANNER_IMAGE_MAX_LENGTH)
  extraLarge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.BANNER_IMAGE_MAX_LENGTH)
  large?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.BANNER_IMAGE_MAX_LENGTH)
  medium?: string;

  @IsOptional()
  @IsString()
  color?: string; // Average color
}

/**
 * DTO for creating media trailer
 */
export class MediaTrailerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.BANNER_IMAGE_MAX_LENGTH)
  thumbnail?: string;
}

/**
 * DTO for creating a new series (media)
 * Based on AniList API Media object: https://docs.anilist.co/reference/object/media
 */
export class CreateSeriesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMal?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTitleDto)
  title?: MediaTitleDto;

  /**
   * The type of the media; anime or manga
   * Required field
   */
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.TYPE))
  type: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.FORMAT))
  format?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.RELEASING_STATUS))
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  startDate?: FuzzyDateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  endDate?: FuzzyDateDto;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.SEASON))
  season?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  seasonYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  seasonInt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  episodes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  chapters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  volumes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.COUNTRY_CODE_LENGTH)
  countryOfOrigin?: string;

  @IsOptional()
  @IsBoolean()
  isLicensed?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.SOURCE))
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.HASHTAG_MAX_LENGTH)
  hashtag?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTrailerDto)
  trailer?: MediaTrailerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaCoverImageDto)
  coverImage?: MediaCoverImageDto;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.BANNER_IMAGE_MAX_LENGTH)
  bannerImage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  averageScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  meanScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  popularity?: number;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trending?: number;

  @IsOptional()
  @IsBoolean()
  isAdult?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  @IsOptional()
  @IsBoolean()
  autoCreateForumThread?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecommendationBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isReviewBlocked?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(SERIES_CONSTANTS.MOD_NOTES_MAX_LENGTH)
  modNotes?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  tags?: Array<{
    id?: number;
    name?: string;
    description?: string;
    category?: string;
    rank?: number;
    isGeneralSpoiler?: boolean;
    isMediaSpoiler?: boolean;
    isAdult?: boolean;
  }>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  externalLinks?: Array<{
    id?: number;
    url?: string;
    site?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  streamingEpisodes?: Array<{
    title?: string;
    thumbnail?: string;
    url?: string;
    site?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  rankings?: Array<{
    id?: number;
    rank?: number;
    type?: string;
    format?: string;
    year?: number;
    season?: string;
    allTime?: boolean;
    context?: string;
  }>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
