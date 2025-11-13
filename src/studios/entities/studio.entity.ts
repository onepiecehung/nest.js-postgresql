import { instanceToPlain } from 'class-transformer';
import { STUDIO_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { StudioSeries } from './studio-series.entity';

/**
 * Studio Entity
 *
 * Represents an animation or production company.
 * Based on AniList API Studio object: https://docs.anilist.co/reference/object/studio
 */
@Entity('studios')
export class Studio extends BaseEntityCustom {
  /**
   * The MAL id of the studio
   * MyAnimeList ID for cross-reference
   */
  @Index() // Index for MAL ID lookup
  @Column({ type: 'string', nullable: true })
  myAnimeListId?: string;

  @Index() // Index for MAL ID lookup
  @Column({ type: 'string', nullable: true })
  aniListId?: string;

  /**
   * The name of the studio
   * Required field
   */
  @Index() // Index for searching by name
  @Column({
    type: 'text',
  })
  name: string;

  /**
   * If the studio is an animation studio or a different kind of company
   * true = animation studio, false = production company or other
   */
  @Index() // Index for filtering by type
  @Column({
    type: 'varchar',
    nullable: false,
    default: STUDIO_CONSTANTS.TYPES.ANIMATION_STUDIO,
  })
  type?: string;

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
   * Series produced by this studio.
   * One-to-Many relationship with StudioSeries junction entity.
   * One studio can produce multiple series with different roles.
   */
  @OneToMany(() => StudioSeries, (studioSeries) => studioSeries.studio, {
    cascade: false, // Don't cascade delete series relationships when studio is deleted
    eager: false, // Don't load series by default for performance
  })
  seriesRoles?: StudioSeries[];

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
