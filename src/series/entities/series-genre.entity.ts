import { instanceToPlain } from 'class-transformer';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Genre } from './geners.entity';
import { Series } from './series.entity';

/**
 * Series Genre Entity
 *
 * Junction entity representing the many-to-many relationship between Series and Genres.
 * Stores additional information about the genre's association with a series.
 *
 * Features:
 * - Series-genre relationship
 * - Unique constraint to prevent duplicate relationships
 * - Support for multiple genres per series
 * - Sort order for custom genre display
 */
@Entity('series_genres')
@Unique(['seriesId', 'genreId']) // Prevent duplicate genre assignments for same series
export class SeriesGenre extends BaseEntityCustom {
  /**
   * Foreign key reference to the series that has this genre.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to series.id',
  })
  seriesId: string;

  /**
   * Series information.
   * Many-to-One relationship with Series entity.
   * When a series is deleted, all its genre relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Series, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seriesId', referencedColumnName: 'id' })
  series: Series;

  /**
   * Foreign key reference to the genre assigned to the series.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to genres.id',
  })
  genreId: string;

  /**
   * Genre information.
   * Many-to-One relationship with Genre entity.
   * When a genre is deleted, all its series relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Genre, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'genreId', referencedColumnName: 'id' })
  genre: Genre;

  /**
   * Sort order for displaying genres in lists for this series.
   * INT DEFAULT 0 - determines the display order of genres for a series.
   * Lower values appear first. Used for custom ordering when a series has multiple genres.
   * Example: Main genre might have sortOrder = 0, secondary genres have higher values.
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Sort order for displaying genres in lists for this series',
  })
  sortOrder: number;

  /**
   * Whether this is the primary/main genre for the series.
   * BOOLEAN DEFAULT FALSE - indicates if this is the primary genre.
   * Used for display purposes and filtering.
   * Typically only one genre per series should be marked as primary.
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this is the primary/main genre for the series',
  })
  isPrimary: boolean;

  /**
   * Notes regarding the genre's relevance to the series.
   * TEXT NULL - optional notes about why this genre applies to the series.
   * Examples: "Main theme", "Secondary element", "Subgenre focus"
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: "Notes regarding the genre's relevance to the series",
  })
  notes?: string;

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
