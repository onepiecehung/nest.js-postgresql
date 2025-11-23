import { instanceToPlain } from 'class-transformer';
import { Character } from 'src/characters/entities/character.entity';
import { Media } from 'src/media/entities/media.entity';
import { STAFF_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { StaffSeries } from './staff-series.entity';

/**
 * Staff Name structure
 * Stores staff names in different languages and formats
 * Based on AniList API StaffName object: https://docs.anilist.co/reference/object/staffname
 */
export interface StaffName {
  /**
   * The person's given name
   */
  first?: string;

  /**
   * The person's middle name
   */
  middle?: string;

  /**
   * The person's surname
   */
  last?: string;

  /**
   * The person's first and last name
   */
  full?: string;

  /**
   * The person's full name in their native language
   */
  native?: string;

  /**
   * Other names the staff member might be referred to as (pen names)
   * Array of alternative names
   */
  alternative?: string[];

  /**
   * The currently authenticated user's preferred name language
   * Default romaji for non-authenticated users
   */
  userPreferred?: string;
}
/**
 * Staff Entity
 *
 * Represents voice actors or production staff.
 * Based on AniList API Staff object structure.
 */
@Entity('staffs')
export class Staff extends BaseEntityCustom {
  /**
   * The MAL id of the staff
   * MyAnimeList ID for cross-reference
   */
  @Index() // Index for MAL ID lookup
  @Column({ type: 'varchar', nullable: true })
  myAnimeListId?: string;

  @Index() // Index for MAL ID lookup
  @Column({ type: 'varchar', nullable: true })
  aniListId?: string;
  /**
   * Staff names in different languages and formats
   * Stored as JSONB for flexible name structure
   */
  @Column({ type: 'jsonb', nullable: true })
  name?: StaffName;

  /**
   * The primary language of the staff member
   * Current values: Japanese, English, Korean, Italian, Spanish, etc.
   */
  @Column({
    type: 'varchar',
    length: STAFF_CONSTANTS.LANGUAGE_MAX_LENGTH,
    nullable: true,
  })
  language?: string;

  /**
   * The URLs of the staff images
   */
  @Column({ type: 'jsonb', nullable: true })
  imageUrls?: Record<string, string>;

  /**
   * The ID of the staff image
   */
  @Column({ type: 'bigint', nullable: true })
  imageId: string;

  /**
   * The staff image
   */
  @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId', referencedColumnName: 'id' })
  image: Media;

  /**
   * General description of the staff member
   * Can be in markdown format
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * The person's primary occupations
   * Examples: ['Voice Actor', 'Director', 'Producer', 'Composer']
   * Stored as JSONB array
   */
  @Column({ type: 'jsonb', nullable: true })
  primaryOccupations?: string[];

  /**
   * Staff's gender
   * Usually Male, Female, or Non-binary but can be any string
   */
  @Column({
    type: 'varchar',
    length: STAFF_CONSTANTS.GENDER_MAX_LENGTH,
    nullable: true,
  })
  gender?: string;

  /**
   * Staff's birth date
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'timestamptz', nullable: true })
  dateOfBirth?: Date;

  /**
   * Staff's death date
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'timestamptz', nullable: true })
  dateOfDeath?: Date;

  /**
   * The person's age in years
   */
  @Column({ type: 'int', nullable: true })
  age?: number;

  /**
   * The staff's debut date
   */
  @Column({ type: 'timestamptz', nullable: true })
  debutDate?: Date;

  /**
   * The person's birthplace or hometown
   */
  @Column({
    type: 'varchar',
    length: STAFF_CONSTANTS.HOME_TOWN_MAX_LENGTH,
    nullable: true,
  })
  homeTown?: string;

  /**
   * The person's blood type
   */
  @Column({
    type: 'varchar',
    length: STAFF_CONSTANTS.BLOOD_TYPE_MAX_LENGTH,
    nullable: true,
  })
  bloodType?: string;

  /**
   * URL for the staff page on the website
   */
  @Column({
    type: 'varchar',
    length: STAFF_CONSTANTS.SITE_URL_MAX_LENGTH,
    nullable: true,
  })
  siteUrl?: string;

  /**
   * Notes for site moderators
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  /**
   * The number of users who have favorited the staff
   */
  @Column({ type: 'int', default: 0 })
  favoriteCount: number;

  /**
   * Staff status
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: 20,
    default: STAFF_CONSTANTS.STATUS.ACTIVE,
  })
  status?: string;

  /**
   * Characters voiced by this staff member
   * One-to-Many relationship with StaffCharacter junction entity
   * One staff can voice multiple characters with role information
   */
  @OneToMany(() => Character, (character) => character.staff, {
    cascade: false, // Don't cascade delete character relationships when staff is deleted
    eager: false, // Don't load characters by default for performance
  })
  characters?: Character[];

  /**
   * Series on which this staff member worked.
   * One-to-Many relationship with StaffSeries junction entity.
   * One staff can work on multiple series with different roles.
   */
  @OneToMany(() => StaffSeries, (staffSeries) => staffSeries.staff, {
    cascade: false, // Don't cascade delete series relationships when staff is deleted
    eager: false, // Don't load series by default for performance
  })
  seriesRoles?: StaffSeries[];

  /**
   * Additional metadata for staff
   * JSON field for storing structured data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

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
