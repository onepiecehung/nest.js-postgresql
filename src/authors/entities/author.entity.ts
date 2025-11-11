import { instanceToPlain } from 'class-transformer';
import { FuzzyDate } from 'src/characters/entities/character.entity';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { AuthorSeries } from './author-series.entity';

/**
 * Author Name structure
 * Stores author names in different languages and formats
 */
export interface AuthorName {
  first?: string;
  middle?: string;
  last?: string;
  full?: string;
  native?: string;
  alternative?: string[];
  userPreferred?: string;
}

/**
 * Author Entity
 *
 * Represents an author (mangaka, novelist, etc.) who creates series.
 * Authors are typically linked to manga/novel series.
 */
@Entity('authors')
@Index(['nationality']) // Index for filtering by nationality
export class Author extends BaseEntityCustom {
  /**
   * Author names in different languages and formats
   * Stored as JSONB for flexible name structure
   */
  @Column({ type: 'jsonb', nullable: true })
  name?: AuthorName;

  /**
   * General description of the author
   * Can include biography, achievements, etc.
   * Can be in markdown format
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Author's birth date
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'jsonb', nullable: true })
  birthDate?: FuzzyDate;

  /**
   * Author's death date (if deceased)
   * Stored as JSONB to support partial dates (FuzzyDate)
   */
  @Column({ type: 'jsonb', nullable: true })
  deathDate?: FuzzyDate;

  /**
   * Author's nationality or country of origin
   * Examples: "Japanese", "Korean", "American"
   */
  @Index() // Index for filtering by nationality
  @Column({
    type: 'varchar',
    length: AUTHOR_CONSTANTS.NATIONALITY_MAX_LENGTH,
    nullable: true,
  })
  nationality?: string;

  /**
   * Author's official website URL
   */
  @Column({
    type: 'varchar',
    length: AUTHOR_CONSTANTS.WEBSITE_MAX_LENGTH,
    nullable: true,
  })
  website?: string;

  /**
   * URL for the author page on the website
   */
  @Column({
    type: 'varchar',
    length: AUTHOR_CONSTANTS.SITE_URL_MAX_LENGTH,
    nullable: true,
  })
  siteUrl?: string;

  /**
   * Social media links and external profiles
   * Stored as JSONB for flexible structure
   * Examples: { twitter: "...", instagram: "..." }
   */
  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: Record<string, string>;

  /**
   * Notes for site moderators
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  modNotes?: string;

  /**
   * Author status
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: 20,
    default: AUTHOR_CONSTANTS.STATUS.ACTIVE,
  })
  status?: string;

  /**
   * Series created by this author
   * One-to-Many relationship with AuthorSeries junction entity
   * One author can create multiple series
   */
  @OneToMany(() => AuthorSeries, (authorSeries) => authorSeries.author, {
    cascade: false, // Don't cascade delete series relationships when author is deleted
    eager: false, // Don't load series by default for performance
  })
  seriesRoles?: AuthorSeries[];

  /**
   * Additional metadata for author
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
