import { Type } from 'class-transformer';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying authors with filters and pagination
 */
export class QueryAuthorDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  query?: string; // Search term for author name

  @IsOptional()
  @IsString()
  nationality?: string; // Filter by nationality

  @IsOptional()
  @IsString()
  @IsIn(Object.values(AUTHOR_CONSTANTS.STATUS))
  status?: string;
}
