import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for linking a series to an author with role information
 */
export class SeriesRoleDto {
  /**
   * ID of the series to link
   */
  @IsString()
  seriesId: string;

  /**
   * Role of the author in the series
   * Examples: 'author', 'story', 'art', 'story_and_art'
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AUTHOR_CONSTANTS.ROLES))
  role?: string;

  /**
   * Notes regarding the author's role for the series
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /**
   * Whether this author is the primary/main author of the series
   */
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  /**
   * Sort order for displaying authors in lists
   * Lower values appear first. Main author typically has sortOrder = 0.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * DTO for linking multiple series to an author
 */
export class LinkSeriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeriesRoleDto)
  series: SeriesRoleDto[];
}
