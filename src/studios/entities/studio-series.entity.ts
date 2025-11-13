import { instanceToPlain } from 'class-transformer';
import { Series } from 'src/series/entities/series.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Studio } from './studio.entity';

/**
 * Studio Series Entity
 *
 * Junction entity representing the many-to-many relationship between Studios and Series.
 * Stores additional information about the studio's role in producing a series.
 *
 * Features:
 * - Studio production relationship with series
 * - Unique constraint to prevent duplicate relationships
 * - Role tracking (main studio, co-producer, etc.)
 * - Support for multiple studios per series
 */
@Entity('studio_series')
@Unique(['studioId', 'seriesId']) // Prevent duplicate relationships
@Index(['studioId']) // Index for filtering by studio
@Index(['seriesId']) // Index for filtering by series
@Index(['isMain']) // Index for filtering main studios
export class StudioSeries extends BaseEntityCustom {
  /**
   * Foreign key reference to the studio that produced the series.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to studios.id',
  })
  studioId: string;

  /**
   * Studio information.
   * Many-to-One relationship with Studio entity.
   * When a studio is deleted, all its series relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Studio, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studioId', referencedColumnName: 'id' })
  studio: Studio;

  /**
   * Foreign key reference to the series produced by the studio.
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
   * When a series is deleted, all its studio relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Series, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seriesId', referencedColumnName: 'id' })
  series: Series;

  /**
   * Role of the studio in producing the series.
   * VARCHAR(50) NULL) - optional role description.
   * Examples: 'main', 'co-producer', 'animation', 'production', 'distributor'
   * Used to distinguish between different types of studio involvement.
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment:
      'Role of the studio in producing the series (e.g., main, co-producer)',
  })
  role?: string;

  /**
   * Whether this studio is the main/primary studio for the series.
   * BOOLEAN DEFAULT FALSE - indicates if this is the primary production studio.
   * Used for display purposes and filtering.
   * Only one studio per series should typically be marked as main.
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this studio is the main/primary studio for the series',
  })
  isMain: boolean;

  /**
   * Notes regarding the studio's role for the series.
   * TEXT NULL - optional notes about the studio's involvement.
   * Examples: "Main animation studio", "Co-production", "Distribution only"
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: "Notes regarding the studio's role for the series",
  })
  roleNotes?: string;

  /**
   * Sort order for displaying studios in lists.
   * INT DEFAULT 0 - determines the display order of studios for a series.
   * Lower values appear first. Main studio typically has sortOrder = 0.
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Sort order for displaying studios in lists',
  })
  sortOrder: number;

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
