import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { COUNTRY_CODES, STAFF_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying staff with filters and pagination
 */
export class QueryStaffDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(STAFF_CONSTANTS.GENDER))
  gender?: string;

  @IsOptional()
  @IsString()
  @IsIn(COUNTRY_CODES.map((country) => country.code))
  language?: string;

  @IsOptional()
  @IsString()
  occupation?: string; // Filter by primary occupation

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characterIds?: string[]; // Filter by linked characters
}
