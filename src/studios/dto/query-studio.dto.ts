import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { STUDIO_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying studios with filters and pagination
 */
export class QueryStudioDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(STUDIO_CONSTANTS.TYPES))
  type?: string; // Filter by studio type
}
