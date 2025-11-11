import { instanceToPlain } from 'class-transformer';
import { Staff } from 'src/staffs/entities/staff.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Series } from './series.entity';

/**
 * Series Staff Entity
 *
 * Junction entity representing the relationship between Series and Staff.
 * Based on AniList API StaffConnection.
 * Stores additional information about the staff member's role in the series.
 */
@Entity('series_staff')
@Unique(['seriesId', 'staffId', 'role']) // Prevent duplicate roles
@Index(['seriesId'])
@Index(['staffId'])
@Index(['role'])
export class SeriesStaff extends BaseEntityCustom {
  /**
   * ID of the series
   * Links to series table
   */
  @Column({ type: 'bigint', nullable: false })
  seriesId: string;

  /**
   * Series information
   * Many-to-One relationship with Series entity
   */
  @ManyToOne(() => Series, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seriesId', referencedColumnName: 'id' })
  series: Series;

  /**
   * ID of the staff member
   * Links to staffs table
   */
  @Column({ type: 'bigint', nullable: false })
  staffId: string;

  /**
   * Staff information
   * Many-to-One relationship with Staff entity
   */
  @ManyToOne(() => Staff, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staffId', referencedColumnName: 'id' })
  staff: Staff;

  /**
   * Role of the staff member in the series
   * Examples: 'Director', 'Producer', 'Composer', 'Voice Actor', etc.
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  role?: string;

  /**
   * Notes regarding the staff member's role in the series
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  roleNotes?: string;

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    return result;
  }
}
