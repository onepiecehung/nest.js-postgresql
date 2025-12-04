import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { SERIES_SEGMENT_CONSTANTS } from 'src/shared/constants/segment.constants';

/**
 * DTO for querying segments with filters and pagination
 */
export class QuerySegmentDto extends AdvancedPaginationDto {
  /**
   * Filter by series ID
   * Optional - filter segments by parent series
   */
  @IsOptional()
  @IsString()
  seriesId?: string;

  /**
   * Filter by segment type
   * Optional - EPISODE, CHAPTER, or TRAILER
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_SEGMENT_CONSTANTS.TYPE))
  type?: string;
}
