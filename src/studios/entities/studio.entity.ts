import { instanceToPlain } from 'class-transformer';
import { STUDIO_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SeriesStudio } from 'src/series/entities/series-studio.entity';

/**
 * Studio Entity
 *
 * Represents an animation or production company.
 * Based on AniList API Studio object: https://docs.anilist.co/reference/object/studio
 */
@Entity('studios')
@Index(['isAnimationStudio']) // Index for filtering by studio type
export class Studio extends BaseEntityCustom {
  /**
   * The name of the studio
   * Required field
   */
  @Index() // Index for searching by name
  @Column({
    type: 'varchar',
    length: STUDIO_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  /**
   * If the studio is an animation studio or a different kind of company
   * true = animation studio, false = production company or other
   */
  @Index() // Index for filtering by type
  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isAnimationStudio: boolean;

  /**
   * URL for the studio page on the AniList website
   */
  @Column({
    type: 'varchar',
    length: STUDIO_CONSTANTS.SITE_URL_MAX_LENGTH,
    nullable: true,
  })
  siteUrl?: string;

  /**
   * Studio status
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: 20,
    default: STUDIO_CONSTANTS.STATUS.ACTIVE,
  })
  status?: string;

  /**
   * Additional metadata for studio
   * JSON field for storing structured data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Series produced by this studio
   * One-to-Many relationship with SeriesStudio junction entity
   * One studio can produce multiple series
   */
  @OneToMany(() => SeriesStudio, (seriesStudio) => seriesStudio.studio, {
    cascade: false, // Don't cascade delete series relationships when studio is deleted
    eager: false, // Don't load series by default for performance
  })
  seriesRoles?: SeriesStudio[];

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    // Remove sensitive fields if any
    return result;
  }
}
