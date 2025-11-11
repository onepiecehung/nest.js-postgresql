import { instanceToPlain } from 'class-transformer';
import { Studio } from 'src/studios/entities/studio.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Series } from './series.entity';

/**
 * Series Studio Entity
 *
 * Junction entity representing the relationship between Series and Studios.
 * Based on AniList API StudioConnection.
 * Stores additional information about the studio's role in the series.
 */
@Entity('series_studios')
@Unique(['seriesId', 'studioId']) // One studio can only be linked once per series
@Index(['seriesId'])
@Index(['studioId'])
export class SeriesStudio extends BaseEntityCustom {
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
   * ID of the studio
   * Links to studios table
   */
  @Column({ type: 'bigint', nullable: false })
  studioId: string;

  /**
   * Studio information
   * Many-to-One relationship with Studio entity
   */
  @ManyToOne(() => Studio, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studioId', referencedColumnName: 'id' })
  studio: Studio;

  /**
   * If the studio was the primary animation studio of the media
   * Based on AniList API StudioConnection.isMain
   */
  @Column({ type: 'boolean', default: false })
  isMain?: boolean;

  /**
   * Notes regarding the studio's role in the series
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
