import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from 'src/common/dto';

/**
 * DTO for querying segments with cursor pagination
 * Extends CursorPaginationDto to add seriesId filtering
 */
export class QuerySegmentCursorDto extends CursorPaginationDto {
  /**
   * Filter by series ID
   * Optional - filter segments by parent series
   */
  @IsOptional()
  @IsString()
  seriesId?: string;

  /**
   * Filter by language code
   * Optional - filter segments by language code
   */
  @IsOptional()
  @IsString()
  languageCode?: string;
}
