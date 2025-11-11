import { Type } from 'class-transformer';
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
} from 'class-validator';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import {
  MediaTitleDto,
  MediaCoverImageDto,
  MediaTrailerDto,
} from './create-series.dto';
import { FuzzyDateDto } from 'src/characters/dto/create-character.dto';

/**
 * DTO for updating an existing series
 * All fields are optional
 */
export class UpdateSeriesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMal?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTitleDto)
  title?: MediaTitleDto;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.TYPE))
  type?: string;

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
  @IsString()
  seriesStatus?: string;

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
