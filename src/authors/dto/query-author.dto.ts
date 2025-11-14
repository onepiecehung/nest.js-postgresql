import { IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';

/**
 * DTO for querying authors with filters and pagination
 */
export class QueryAuthorDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  nationality?: string; // Filter by nationality
}
