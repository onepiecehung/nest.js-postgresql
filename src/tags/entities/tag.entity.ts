import { Article } from 'src/articles/entities/article.entity';
import { Series } from 'src/series/entities/series.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, ManyToMany, OneToMany } from 'typeorm';

/**
 * Tag Entity
 *
 * Represents content tags for categorization and discovery
 * Features:
 * - Unique name and slug for SEO
 * - Usage tracking for popularity
 * - Color coding for visual organization
 * - Soft delete support
 * - Search optimization with indexes
 */
@Entity({ name: 'tags' })
export class Tag extends BaseEntityCustom {
  /**
   * Tag name - human readable name
   * Examples: "JavaScript", "React", "Tutorial", "News"
   * Maximum length: 64 characters
   */
  @Index()
  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    unique: true,
    comment: 'Tag name, must be unique',
  })
  name: string;

  @Index() // Index for anilist ID lookup
  @Column({ type: 'varchar', nullable: true })
  aniListTagId?: string;

  /**
   * URL-friendly slug for SEO and routing
   * Generated from name, must be unique
   * Examples: "javascript", "react", "tutorial", "news"
   */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 80,
    nullable: false,
    unique: true,
    comment: 'URL-friendly slug, must be unique',
  })
  slug: string;

  /**
   * Optional tag description for context
   * Can be used in tag pages and tooltips
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Tag description for context and SEO',
  })
  description?: string;

  /**
   * Tag color for visual organization
   * Stored as hex color code
   * Examples: "#3B82F6", "#10B981", "#F59E0B"
   */
  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'Tag color in hex format (e.g., #3B82F6)',
  })
  color?: string;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'Tag color in hex format (e.g., #3B82F6)',
  })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tag category',
  })
  category?: string;

  /**
   * Tag icon for visual representation
   * Can be emoji, icon name, or icon URL
   * Examples: "🚀", "code", "https://example.com/icon.svg"
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tag icon (emoji, icon name, or URL)',
  })
  icon?: string;

  /**
   * Number of times this tag has been used
   * Used for popularity ranking and statistics
   * Automatically updated when articles use this tag
   */
  @Index()
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Number of times this tag has been used',
  })
  usageCount: number;

  /**
   * Whether this tag is active and visible
   * Inactive tags are hidden from public views
   * but can still be used for existing articles
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether this tag is active and visible',
  })
  isActive: boolean;

  /**
   * Whether this tag is featured/promoted
   * Featured tags appear in trending/popular sections
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this tag is featured/promoted',
  })
  isFeatured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this tag is a media spoiler',
  })
  isMediaSpoiler: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this tag is a general spoiler for all media',
  })
  isGeneralSpoiler: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this tag is for adult content',
  })
  isAdult: boolean;

  /**
   * SEO meta title for tag pages
   * If not provided, uses tag name
   */
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'SEO meta title for tag pages',
  })
  metaTitle?: string;

  /**
   * SEO meta description for tag pages
   * Used in search engine results
   */
  @Column({
    type: 'varchar',
    length: 300,
    nullable: true,
    comment: 'SEO meta description for tag pages',
  })
  metaDescription?: string;

  /**
   * Additional metadata as JSON
   * Can store custom properties like:
   * - category: "technology", "lifestyle", "business"
   * - language: "en", "vi"
   * - parentTag: "programming" (for hierarchical tags)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata as JSON',
  })
  metadata?: Record<string, any>;

  /**
   * Articles that use this tag
   * Many-to-Many relationship through article_tags junction table
   */
  @OneToMany(() => Article, (article) => article.tags)
  articles?: Article[];

  /**
   * Series that use this tag
   * Many-to-Many relationship through series_tags junction table
   */
  @ManyToMany(() => Series, (series) => series.tags)
  series?: Series[];

  /**
   * Get display name with icon if available
   */
  get displayName(): string {
    return this.icon ? `${this.icon} ${this.name}` : this.name;
  }

  /**
   * Check if tag is popular based on usage count
   */
  get isPopular(): boolean {
    return this.usageCount >= 10; // Threshold for popular tags
  }

  /**
   * Get tag URL for frontend routing
   */
  get url(): string {
    return `/tags/${this.slug}`;
  }
}
