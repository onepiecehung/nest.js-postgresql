import { instanceToPlain } from 'class-transformer';
import { Series } from 'src/series/entities/series.entity';
import { STAFF_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Staff } from './staff.entity';

/**
 * Staff Series Entity
 *
 * Junction entity representing the many-to-many relationship between Staff and Series.
 * Stores additional information about the staff member's role in producing a series.
 *
 * Features:
 * - Staff-series relationship with role information
 * - Unique constraint to prevent duplicate relationships
 * - Role tracking (director, producer, composer, sound director, etc.)
 * - Support for multiple staff members per series with different roles
 */
@Entity('staff_series')
@Unique(['staffId', 'seriesId', 'role']) // Prevent duplicate roles for same staff-series combination
export class StaffSeries extends BaseEntityCustom {
  /**
   * Foreign key reference to the staff member who worked on the series.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to staffs.id',
  })
  staffId: string;

  /**
   * Staff member information.
   * Many-to-One relationship with Staff entity.
   * When a staff member is deleted, all their series relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Staff, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staffId', referencedColumnName: 'id' })
  staff: Staff;

  /**
   * Foreign key reference to the series on which the staff member worked.
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
   * When a series is deleted, all its staff relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Series, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seriesId', referencedColumnName: 'id' })
  series: Series;

  /**
   * Role of the staff member in producing the series.
   * VARCHAR(100) NULL - optional role description.
   * Examples: 'director', 'producer', 'composer', 'sound_director', 'animation_director',
   * 'character_designer', 'art_director', 'series_composer', 'script', 'storyboard', etc.
   * Used to distinguish between different types of staff involvement.
   * Based on primaryOccupations or specific role in the series.
   */
  @Index() // Index for filtering by role
  @Column({
    type: 'varchar',
    length: STAFF_CONSTANTS.OCCUPATION_MAX_LENGTH,
    nullable: true,
    comment:
      'Role of the staff member in producing the series (e.g., director, producer, composer)',
  })
  role?: string;

  /**
   * Whether this staff member is the main/primary person for this role.
   * BOOLEAN DEFAULT FALSE - indicates if this is the primary person for the role.
   * Used for display purposes and filtering.
   * Multiple staff can be marked as main if they share primary responsibility for different roles.
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment:
      'Whether this staff member is the main/primary person for this role',
  })
  isMain: boolean;

  /**
   * Notes regarding the staff member's role for the series.
   * TEXT NULL - optional notes about the staff member's involvement.
   * Examples: "Main director", "Co-producer", "Sound effects only", "Episodes 1-12"
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: "Notes regarding the staff member's role for the series",
  })
  notes?: string;

  /**
   * Sort order for displaying staff members in lists.
   * INT DEFAULT 0 - determines the display order of staff for a series.
   * Lower values appear first. Main staff typically has sortOrder = 0.
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Sort order for displaying staff members in lists',
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
