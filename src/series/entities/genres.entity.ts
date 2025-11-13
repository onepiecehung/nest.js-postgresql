import { instanceToPlain } from 'class-transformer';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SeriesGenre } from './series-genre.entity';

/**
 * Genre Entity
 *
 * Represents a genre category for series (anime/manga).
 * Genres are used to categorize and filter series by their themes and content.
 * Examples: Action, Adventure, Comedy, Drama, Fantasy, Horror, Romance, etc.
 *
 * The entity extends BaseEntityCustom which provides:
 * - id (Snowflake BIGINT, auto-generated)
 * - uuid (for external references)
 * - createdAt, updatedAt, deletedAt (timestamps with microsecond precision)
 * - version (optimistic locking)
 * - Soft delete support
 */
@Entity('genres')
export class Genre extends BaseEntityCustom {
  /**
   * URL-friendly unique identifier for the genre.
   * VARCHAR(255) UNIQUE - used for generating clean URLs and API endpoints.
   * Examples: "action", "adventure", "comedy", "romance", "sci-fi"
   * Must be unique across all genres to prevent URL conflicts.
   */
  @Index() // Index for slug lookup
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  slug: string;

  /**
   * Display name of the genre.
   * VARCHAR(255) NOT NULL - the human-readable genre name.
   * Examples: "Action", "Adventure", "Comedy", "Romance", "Science Fiction"
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  /**
   * Detailed description of the genre.
   * TEXT NULL - optional description explaining what the genre represents.
   * Can include examples, characteristics, and common themes.
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Icon identifier or URL for the genre.
   * VARCHAR(255) NULL - icon name, icon class, or icon URL.
   * Used for displaying genre icons in the UI.
   * Examples: "action-icon", "fa-sword", "https://cdn.example.com/icons/action.svg"
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  icon?: string;

  /**
   * Color code for the genre (hex, RGB, or color name).
   * VARCHAR(50) NULL - color representation for UI theming.
   * Examples: "#FF5733", "rgb(255, 87, 51)", "red", "primary"
   * Used for visual distinction and theming in the application.
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  color?: string;

  /**
   * Sort order for displaying genres in lists.
   * INT DEFAULT 0 - determines the display order of genres.
   * Lower values appear first. Used for custom ordering in dropdowns and filters.
   * Default: 0 (appears in natural order)
   */
  @Index() // Index for sorting
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
  })
  sortOrder: number;

  /**
   * NSFW content flag.
   * BOOLEAN DEFAULT FALSE - indicates if the genre is associated with adult/18+ content.
   * Used for content filtering and age restriction enforcement.
   * When true, requires age verification or appropriate user settings.
   */
  @Index() // Index for filtering NSFW content
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  isNsfw: boolean;

  /**
   * Additional metadata for the genre.
   * JSONB field for storing structured data.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * Series associated with this genre.
   * One-to-Many relationship with SeriesGenre junction entity.
   * One genre can be associated with multiple series.
   */
  @OneToMany(() => SeriesGenre, (seriesGenre) => seriesGenre.genre, {
    cascade: false, // Don't cascade delete series relationships when genre is deleted
    eager: false, // Don't load series by default for performance
  })
  seriesRoles?: SeriesGenre[];

  /**
   * Convert entity to JSON with proper serialization.
   * Removes any sensitive fields and ensures proper formatting.
   *
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    // Remove sensitive fields if any
    return result;
  }
}
