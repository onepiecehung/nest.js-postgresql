import { instanceToPlain } from 'class-transformer';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { StaffCharacter } from 'src/staffs/entities/staff-character.entity';
import { SeriesCharacter } from 'src/series/entities/series-character.entity';

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
 * Character Image structure
 * Stores character image URLs
 */
export interface CharacterImage {
  large?: string;
  medium?: string;
}

/**
 * Fuzzy Date structure for date of birth
 * Supports partial dates (year only, year-month, or full date)
 */
export interface FuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

/**
 * Character Entity
 *
 * Represents a character that features in anime or manga.
 * Based on AniList API Character object structure.
 */
@Entity('characters')
@Index(['gender']) // Index for filtering by gender
export class Character extends BaseEntityCustom {
  /**
   * Character names in different languages and formats
   * Stored as JSONB for flexible name structure
   */
  @Column({ type: 'jsonb', nullable: true })
  name?: CharacterName;

  /**
   * Character images (large, medium)
   * Stored as JSONB for image URLs
   */
  @Column({ type: 'jsonb', nullable: true })
  image?: CharacterImage;

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
    type: 'varchar',
    length: CHARACTER_CONSTANTS.GENDER_MAX_LENGTH,
    nullable: true,
  })
  gender?: string;

  /**
   * Character's birth date
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'jsonb', nullable: true })
  dateOfBirth?: FuzzyDate;

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
   * Notes for site moderators
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  modNotes?: string;

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
   * Staff members (voice actors) who voice this character
   * One-to-Many relationship with StaffCharacter junction entity
   * One character can be voiced by multiple staff members
   */
  @OneToMany(
    () => StaffCharacter,
    (staffCharacter) => staffCharacter.character,
    {
      cascade: false, // Don't cascade delete staff relationships when character is deleted
      eager: false, // Don't load staff by default for performance
    },
  )
  staffRoles?: StaffCharacter[];

  /**
   * Series in which this character appears
   * One-to-Many relationship with SeriesCharacter junction entity
   * One character can appear in multiple series with different roles
   */
  @OneToMany(
    () => SeriesCharacter,
    (seriesCharacter) => seriesCharacter.character,
    {
      cascade: false, // Don't cascade delete series relationships when character is deleted
      eager: false, // Don't load series by default for performance
    },
  )
  seriesRoles?: SeriesCharacter[];

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
