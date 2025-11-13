import { instanceToPlain } from 'class-transformer';
import { Series } from 'src/series/entities/series.entity';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Author } from './author.entity';

/**
 * Author Series Entity
 *
 * Junction entity representing the many-to-many relationship between Authors and Series.
 * Stores additional information about the author's role in creating a series.
 *
 * Features:
 * - Author-series relationship with role information
 * - Unique constraint to prevent duplicate relationships
 * - Role tracking (author, story, art, story_and_art, etc.)
 * - Support for multiple authors per series with different roles
 */
@Entity('author_series')
@Unique(['authorId', 'seriesId', 'role']) // Prevent duplicate roles for same author-series combination
export class AuthorSeries extends BaseEntityCustom {
  /**
   * Foreign key reference to the author who created the series.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to authors.id',
  })
  authorId: string;

  /**
   * Author information.
   * Many-to-One relationship with Author entity.
   * When an author is deleted, all their series relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Author, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId', referencedColumnName: 'id' })
  author: Author;

  /**
   * Foreign key reference to the series created by the author.
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
   * When a series is deleted, all its author relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Series, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seriesId', referencedColumnName: 'id' })
  series: Series;

  /**
   * Role of the author in creating the series.
   * VARCHAR(100) NULL - optional role description.
   * Examples: 'author', 'story', 'art', 'story_and_art', 'original_creator', 'illustrator', 'writer'
   * Used to distinguish between different types of author involvement.
   * Based on AUTHOR_CONSTANTS.ROLES enum values.
   */
  @Index() // Index for filtering by role
  @Column({
    type: 'varchar',
    length: AUTHOR_CONSTANTS.ROLE_MAX_LENGTH,
    nullable: true,
    comment:
      'Role of the author in creating the series (e.g., author, story, art, story_and_art)',
  })
  role?: string;

  /**
   * Whether this author is the main/primary author of the series.
   * BOOLEAN DEFAULT FALSE - indicates if this is the primary creator.
   * Used for display purposes and filtering.
   * Multiple authors can be marked as main if they share primary responsibility.
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this author is the main/primary author of the series',
  })
  isMain: boolean;

  /**
   * Notes regarding the author's role for the series.
   * TEXT NULL - optional notes about the author's involvement.
   * Examples: "Main author", "Co-author", "Original creator", "Story only"
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: "Notes regarding the author's role for the series",
  })
  notes?: string;

  /**
   * Sort order for displaying authors in lists.
   * INT DEFAULT 0 - determines the display order of authors for a series.
   * Lower values appear first. Main author typically has sortOrder = 0.
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Sort order for displaying authors in lists',
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
