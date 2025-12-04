import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Media } from 'src/media/entities/media.entity';
import { SERIES_SEGMENT_CONSTANTS } from 'src/shared/constants/segment.constants';

/**
 * DTO for creating a new segment (episode/chapter)
 * Represents an episode for anime or a chapter for manga/light novel
 */
export class CreateSegmentDto {
  /**
   * The ID of the series this segment belongs to
   * Required field - segment must belong to a series
   */
  @IsNotEmpty()
  @IsString()
  seriesId: string;

  @IsOptional()
  attachmentIds?: string[];

  @IsOptional()
  attachments?: Media[];

  /**
   * The ID of the user who created the segment
   * Optional - can be set automatically from authenticated user
   */
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * The ID of the organization that created the segment
   * Optional - for organization-owned content
   */
  @IsOptional()
  @IsString()
  organizationId?: string;

  /**
   * Segment type: EPISODE (for anime), CHAPTER (for manga/light novel), TRAILER (for previews)
   * Required field
   */
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(SERIES_SEGMENT_CONSTANTS.TYPE))
  type: string;

  /**
   * Primary segment number (episode/chapter number)
   * Required field - must be a positive integer
   * Examples: 1, 2, 12, 13
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number: number;

  /**
   * Sub-number for special segments (e.g., .5 episodes/chapters)
   * Optional field for fractional numbering
   * Examples: Chapter 12.5 → number = 12, subNumber = 5
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  subNumber?: number;

  /**
   * Segment title
   * Optional - can be used for named episodes/chapters
   */
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_SEGMENT_CONSTANTS.TITLE_MAX_LENGTH)
  title?: string;

  /**
   * Full description or detailed content of the segment
   * Optional - can store lengthy descriptions
   */
  @IsOptional()
  @IsString()
  @MaxLength(SERIES_SEGMENT_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  /**
   * URL-friendly slug for the segment
   * Optional - auto-generated if not provided
   * Examples: "episode-1", "ch-12-5", "ep-01-the-beginning"
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  /**
   * Short summary or preview text for the segment
   * Optional - used for listing pages and preview cards
   */
  @IsOptional()
  @IsString()
  summary?: string;

  /**
   * Duration in seconds (primarily for anime/video content)
   * Optional - only relevant for EPISODE type segments
   * Example: 24 minutes = 1440 seconds
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec?: number;

  /**
   * Total page count (primarily for manga/light novel content)
   * Optional - only relevant for CHAPTER type segments
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageCount?: number;

  /**
   * Starting page number (optional, for page range mapping)
   * Optional - only relevant for CHAPTER type segments
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  startPage?: number;

  /**
   * Ending page number (optional, for page range mapping)
   * Optional - only relevant for CHAPTER type segments
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  endPage?: number;

  /**
   * Lifecycle status of the segment
   * Optional - defaults to ACTIVE
   * Values: ACTIVE, INACTIVE, PENDING, ARCHIVED
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_SEGMENT_CONSTANTS.STATUS))
  status?: string;

  /**
   * Actual publication timestamp on the platform
   * Optional - when the segment was made publicly available
   * Can be set in the future for scheduled releases
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publishedAt?: Date;

  /**
   * Original release date from the source material
   * Optional - original publication date (e.g., in Japan, US)
   * Different from publishedAt which is when it appeared on this platform
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  originalReleaseDate?: Date;

  /**
   * Access control type for the segment
   * Optional - defaults to FREE
   * Values: FREE, PAID, SUBSCRIPTION, MEMBERSHIP
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(SERIES_SEGMENT_CONSTANTS.ACCESS_TYPE))
  accessType?: string;

  /**
   * Language code for the segment content
   * Optional - ISO 639-1 language code (e.g., "ja", "en", "vi", "ja-JP")
   * Supports both 2-letter codes (ja) and locale codes (ja-JP)
   */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  /**
   * Not Safe For Work flag
   * Optional - defaults to false
   * Indicates if content contains adult/18+ material
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isNsfw?: boolean;

  /**
   * Flexible metadata storage as JSONB
   * Optional - stores additional structured data
   * Examples:
   * - { "fansub": "ABC Team", "resolution": "1080p", "audio": ["ja", "en"] }
   * - { "translator": "XYZ", "quality": "high", "format": "webp" }
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
