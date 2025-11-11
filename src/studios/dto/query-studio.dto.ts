import { Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { STUDIO_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying studios with filters and pagination
 */
export class QueryStudioDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  query?: string; // Search term for studio name

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnimationStudio?: boolean; // Filter by studio type

  @IsOptional()
  @IsString()
  @IsIn(Object.values(STUDIO_CONSTANTS.STATUS))
  status?: string;
}
