import { instanceToPlain } from 'class-transformer';
import { Media } from 'src/media/entities/media.entity';
import { Series } from 'src/series/entities/series.entity';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Character Name structure
 * Stores character names in different languages and formats
 */
export interface CharacterName {
  first?: string;
  middle?: string;
  last?: string;
  full?: string;
  native?: string;
  alternative?: string[];
  alternativeSpoiler?: string[];
  userPreferred?: string;
}
/**
 * Character Entity
 *
 * Represents a character that features in anime or manga.
 * Based on AniList API Character object structure.
 */
@Entity('characters')
export class Character extends BaseEntityCustom {
  /**
   * The MAL id of the character
   * MyAnimeList ID for cross-reference
   */
  @Index() // Index for MAL ID lookup
  @Column({ type: 'varchar', nullable: true })
  myAnimeListId?: string;

  @Index() // Index for MAL ID lookup
  @Column({ type: 'varchar', nullable: true })
  aniListId?: string;
  /**
   * Character names in different languages and formats
   * Stored as JSONB for flexible name structure
   */
  @Column({ type: 'jsonb', nullable: true })
  name?: CharacterName;

  /**
   * The ID of the character image
   */
  @Column({ type: 'bigint', nullable: true })
  imageId?: string;

  /**
   * The character image
   */
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'imageId', referencedColumnName: 'id' })
  image?: Media;

  /**
   * General description of the character
   * Can be in markdown format
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Character's gender
   * Usually Male, Female, or Non-binary but can be any string
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  gender?: string;

  /**
   * Character's birth date
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'timestamptz', nullable: true })
  dateOfBirth?: Date;

  /**
   * Character's age
   * Note: stored as string to support additional text and multiple ages
   */
  @Column({
    type: 'varchar',
    length: CHARACTER_CONSTANTS.AGE_MAX_LENGTH,
    nullable: true,
  })
  age?: string;

  /**
   * Character's blood type
   */
  @Column({
    type: 'varchar',
    length: CHARACTER_CONSTANTS.BLOOD_TYPE_MAX_LENGTH,
    nullable: true,
  })
  bloodType?: string;

  /**
   * URL for the character page on the website
   */
  @Column({
    type: 'varchar',
    length: CHARACTER_CONSTANTS.SITE_URL_MAX_LENGTH,
    nullable: true,
  })
  siteUrl?: string;

  /**
   * Notes for the character
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  /**
   * Character status
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: 20,
    default: CHARACTER_CONSTANTS.STATUS.ACTIVE,
  })
  status?: string;

  /**
   * Additional metadata for character
   * JSON field for storing structured data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * The ID of the staff member who voices this character
   * Nullable because not all characters have a voice actor associated
   */
  @Column({ type: 'bigint', nullable: true })
  staffId?: string;

  /**
   * Staff member (voice actor) who voices this character
   * Many-to-One relationship with Staff entity
   */
  @ManyToOne(() => Staff, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staffId', referencedColumnName: 'id' })
  staff?: Staff;

  /**
   * The ID of the series in which this character appears
   */
  @Column({ type: 'bigint', nullable: false })
  seriesId?: string;

  /**
   * Series in which this character appears
   * Many-to-One relationship with Series entity
   * One character can appear in one series
   */
  @ManyToOne(() => Series, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seriesId', referencedColumnName: 'id' })
  series?: Series;

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
