import { Media } from 'src/media/entities/media.entity';
import { SERIES_SEGMENT_CONSTANTS } from 'src/shared/constants/segment.constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Series } from './series.entity';

/**
 * Series Segments Entity
 *
 * Purpose: Unified table for managing both episodes (anime) and chapters (manga/light novel).
 * This design allows:
 * - Numbering system for episodes/chapters
 * - Title, description, and thumbnail support
 * - Duration (anime) / page count (manga/LN)
 * - Status management: draft/published/hidden
 * - Access control: free/premium/subscription
 * - Future extensibility (OVA, special, bonus, extra content)
 *
 * The entity extends BaseEntityCustom which provides:
 * - id (Snowflake BIGINT, auto-generated)
 * - uuid (for external references)
 * - createdAt, updatedAt, deletedAt (timestamps with microsecond precision)
 * - version (optimistic locking)
 * - Soft delete support
 */
@Entity('segments')
export class Segments extends BaseEntityCustom {
  /**
   * Foreign key to the parent series (anime/manga/light novel).
   * References the series table to establish the relationship.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({ type: 'bigint', nullable: false })
  seriesId: string;

  /**
   * Many-to-One relationship with Series entity.
   * When a series is deleted, all its segments are cascaded (CASCADE delete).
   * This ensures data consistency and prevents orphaned segments.
   */
  @ManyToOne(() => Series, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  series: Series;

  /**
   * Segment type identifier.
   * ENUM: EPISODE (for anime), CHAPTER (for manga/light novel), TRAILER (for previews).
   * Used to differentiate display logic and filtering behavior.
   * Example: EPISODE for anime episodes, CHAPTER for manga chapters.
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: SERIES_SEGMENT_CONSTANTS.TYPE,
  })
  type: string;

  /**
   * Primary segment number (official episode/chapter number).
   * INT NOT NULL - represents the main sequential number.
   * Examples: Episode 1, Episode 2, Chapter 12, Chapter 13.
   * Used for default ordering: ORDER BY number, subNumber.
   */
  @Column({ type: 'int', nullable: false })
  number: number;

  /**
   * Sub-number for special segments (e.g., .5 episodes/chapters).
   * INT NULL - optional field for fractional numbering.
   * Examples: Chapter 12.5 → number = 12, subNumber = 5
   *           Episode 3.5 → number = 3, subNumber = 5
   * Used in combination with number for precise ordering.
   */
  @Column({ type: 'int', nullable: true })
  subNumber?: number;

  @Column({ type: 'text', nullable: true })
  title?: string;

  /**
   * Full description or detailed content of the segment.
   * TEXT NULL - can store lengthy descriptions.
   * Note: For very large content (full text of light novels), consider using
   * a separate segment_contents table instead of storing here.
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * URL-friendly slug for the segment.
   * VARCHAR(255) UNIQUE - used for generating clean URLs.
   * Examples: "episode-1", "ch-12-5", "ep-01-the-beginning"
   * Must be unique across all segments to prevent URL conflicts.
   */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  slug?: string;

  /**
   * Short summary or preview text for the segment.
   * TEXT NULL - used for listing pages and preview cards.
   * Typically shorter than description, optimized for quick scanning.
   */
  @Column({ type: 'text', nullable: true })
  summary?: string;

  /**
   * Duration in seconds (primarily for anime/video content).
   * INT NULL - stores duration as total seconds.
   * Example: 24 minutes = 1440 seconds.
   * Only relevant for EPISODE type segments.
   */
  @Column({ type: 'int', nullable: true })
  durationSec?: number;

  /**
   * One-to-Many relationship with Media entities.
   * Represents all media files associated with this segment:
   * - Video files (for anime episodes)
   * - Thumbnail images
   * - Cover images
   * - PDF/EPUB files (for manga/light novel chapters)
   * Cascade: true ensures media is deleted when segment is deleted.
   */
  @OneToMany(() => Media, (media) => media.segment, {
    cascade: true,
  })
  media?: Media[];

  /**
   * Total page count (primarily for manga/light novel content).
   * INT NULL - total number of pages in the chapter.
   * Only relevant for CHAPTER type segments.
   * Used for displaying progress and calculating reading time.
   */
  @Column({ type: 'int', nullable: true })
  pageCount?: number;

  /**
   * Starting page number (optional, for page range mapping).
   * INT NULL - used when a segment maps to a specific page range.
   * Typically used when chapters are split or merged from source material.
   * Only relevant for CHAPTER type segments.
   */
  @Column({ type: 'int', nullable: true })
  startPage?: number;

  /**
   * Ending page number (optional, for page range mapping).
   * INT NULL - used in combination with startPage to define a page range.
   * Only relevant for CHAPTER type segments.
   */
  @Column({ type: 'int', nullable: true })
  endPage?: number;

  /**
   * Lifecycle status of the segment.
   * ENUM: ACTIVE, INACTIVE, PENDING, ARCHIVED.
   * Default: ACTIVE
   * - ACTIVE: Published and visible to users
   * - INACTIVE: Hidden from public view
   * - PENDING: Awaiting approval or processing
   * - ARCHIVED: Moved to archive, no longer actively maintained
   */
  @Column({
    type: 'enum',
    enum: SERIES_SEGMENT_CONSTANTS.STATUS,
    default: SERIES_SEGMENT_CONSTANTS.STATUS.ACTIVE,
  })
  status: string;

  /**
   * Actual publication timestamp on the platform.
   * TIMESTAMPTZ NULL - when the segment was made publicly available.
   * Used for scheduling releases and tracking publication history.
   * Can be set in the future for scheduled releases.
   */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  /**
   * Original release date from the source material.
   * TIMESTAMPTZ NULL - original publication date (e.g., in Japan, US).
   * Used for historical accuracy and chronological sorting.
   * Different from publishedAt which is when it appeared on this platform.
   */
  @Column({ type: 'timestamptz', nullable: true })
  originalReleaseDate?: Date;

  /**
   * Access control type for the segment.
   * ENUM: FREE, PAID, SUBSCRIPTION, MEMBERSHIP.
   * Default: FREE
   * - FREE: Accessible to all users without restrictions
   * - PAID: Requires individual purchase or pack purchase
   * - SUBSCRIPTION: Requires active subscription plan
   * - MEMBERSHIP: Requires special membership tier
   * This replaces multiple boolean flags (isFree, isPremium) to avoid conflicts.
   */
  @Column({
    type: 'enum',
    enum: SERIES_SEGMENT_CONSTANTS.ACCESS_TYPE,
    default: SERIES_SEGMENT_CONSTANTS.ACCESS_TYPE.FREE,
  })
  accessType: string;

  /**
   * Language code for the segment content.
   * VARCHAR(10) NULL - ISO 639-1 language code (e.g., "ja", "en", "vi", "ja-JP").
   * Used for filtering and displaying content in user's preferred language.
   * Supports both 2-letter codes (ja) and locale codes (ja-JP).
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  languageCode?: string;

  /**
   * Not Safe For Work flag.
   * BOOLEAN DEFAULT FALSE - indicates if content contains adult/18+ material.
   * Used for content filtering and age restriction enforcement.
   * When true, requires age verification or appropriate user settings.
   */
  @Column({ type: 'boolean', default: false })
  isNsfw: boolean;

  /**
   * Flexible metadata storage as JSONB.
   * JSONB DEFAULT '{}' - stores additional structured data.
   * Examples:
   * - { "fansub": "ABC Team", "resolution": "1080p", "audio": ["ja", "en"] }
   * - { "translator": "XYZ", "quality": "high", "format": "webp" }
   * Allows extensibility without schema changes for content-specific attributes.
   */
  @Column({ type: 'jsonb', default: () => `'{}'` })
  metadata?: Record<string, any>;
}
