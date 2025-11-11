import { instanceToPlain } from 'class-transformer';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';
import { Series } from 'src/series/entities/series.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Author } from './author.entity';

/**
 * Author Series Entity
 *
 * Junction entity representing the relationship between Authors and Series.
 * Stores additional information about the author's role for a series.
 */
@Entity('author_series')
@Unique(['authorId', 'seriesId', 'role']) // Prevent duplicate roles
@Index(['authorId'])
@Index(['seriesId'])
@Index(['role'])
export class AuthorSeries extends BaseEntityCustom {
  /**
   * ID of the author
   * Links to authors table
   */
  @Column({ type: 'bigint', nullable: false })
  authorId: string;

  /**
   * Author information
   * Many-to-One relationship with Author entity
   */
  @ManyToOne(() => Author, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId', referencedColumnName: 'id' })
  author: Author;

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
   * Role of the author in the series
   * Examples: 'author', 'story', 'art', 'story_and_art', 'original_creator'
   */
  @Column({
    type: 'varchar',
    length: AUTHOR_CONSTANTS.ROLE_MAX_LENGTH,
    nullable: true,
  })
  role?: string;

  /**
   * Notes regarding the author's role for the series
   * Examples: "Main author", "Co-author", "Original creator"
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  roleNotes?: string;

  /**
   * Whether this author is the primary/main author of the series
   */
  @Column({ type: 'boolean', default: false })
  isMain?: boolean;

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    return result;
  }
}
