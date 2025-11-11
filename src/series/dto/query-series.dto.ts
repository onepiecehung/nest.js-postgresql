import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { SERIES_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying series with filters and pagination
 */
export class QuerySeriesDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  query?: string; // Search term for series title

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.TYPE))
  type?: string; // ANIME or MANGA

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
  @IsIn(Object.values(SERIES_CONSTANTS.SEASON))
  season?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  seasonYear?: number;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.SOURCE))
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[]; // Filter by genres

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAdult?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isLicensed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number; // Minimum average score

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore?: number; // Maximum average score

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPopularity?: number; // Minimum popularity

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPopularity?: number; // Maximum popularity

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_CONSTANTS.STATUS))
  seriesStatus?: string; // Internal status
}
