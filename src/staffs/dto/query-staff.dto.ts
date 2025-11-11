import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsArray,
} from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { STAFF_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying staff with filters and pagination
 */
export class QueryStaffDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  query?: string; // Search term for staff name

  @IsOptional()
  @IsString()
  @IsIn(Object.values(STAFF_CONSTANTS.GENDER))
  gender?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(STAFF_CONSTANTS.LANGUAGES))
  languageV2?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(STAFF_CONSTANTS.STATUS))
  status?: string;

  @IsOptional()
  @IsString()
  occupation?: string; // Filter by primary occupation

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  minYearActive?: number; // Minimum year active

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  maxYearActive?: number; // Maximum year active

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characterIds?: string[]; // Filter by linked characters
}
