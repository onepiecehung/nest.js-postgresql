import { instanceToPlain } from 'class-transformer';
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
   */
  @Column({ type: 'timestamptz', nullable: true })
  dateOfBirth?: Date;

  /**
   * Author's death date (if deceased)
   */
  @Column({ type: 'timestamptz', nullable: true })
  dateOfDeath?: Date;

  /**
   * Author's nationality or country of origin
   * Examples: "Japanese", "Korean", "American"
   */
  @Index() // Index for filtering by nationality
  @Column({
    type: 'text',
    nullable: true,
  })
  nationality?: string;

  /**
   * Author's official website URL
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  website?: string;

  /**
   * URL for the author page on the website
   */
  @Column({
    type: 'text',
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
   * Notes for the author
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  /**
   * Author status
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'enum',
    enum: AUTHOR_CONSTANTS.STATUS,
    nullable: true,
  })
  status?: string;

  /**
   * Series created by this author.
   * One-to-Many relationship with AuthorSeries junction entity.
   * One author can create multiple series with different roles.
   */
  @OneToMany(() => AuthorSeries, (authorSeries) => authorSeries.author, {
    cascade: false, // Don't cascade delete series relationships when author is deleted
    eager: false, // Don't load series by default for performance
  })
  seriesRoles?: AuthorSeries[];

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
