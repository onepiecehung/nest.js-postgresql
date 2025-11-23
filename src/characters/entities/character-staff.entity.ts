import { instanceToPlain } from 'class-transformer';
import { Staff } from 'src/staffs/entities/staff.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Character } from './character.entity';

/**
 * Character Staff Entity
 *
 * Junction entity representing the many-to-many relationship between Characters and Staff.
 * Stores additional information about the voice actor's role for a character.
 *
 * Features:
 * - Character-voice actor relationship with language information
 * - Unique constraint to prevent duplicate relationships
 * - Language tracking (Japanese, English, etc.)
 * - Support for multiple voice actors per character (different languages)
 * - Support for multiple characters per voice actor
 */
@Entity('character_staff')
@Unique(['characterId', 'staffId', 'language']) // Prevent duplicate voice actor assignments for same character-language combination
@Index(['characterId']) // Index for filtering by character
@Index(['staffId']) // Index for filtering by staff
@Index(['language']) // Index for filtering by language
export class CharacterStaff extends BaseEntityCustom {
  /**
   * Foreign key reference to the character that is voiced.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to characters.id',
  })
  characterId: string;

  /**
   * Character information.
   * Many-to-One relationship with Character entity.
   * When a character is deleted, all its voice actor relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Character, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'characterId', referencedColumnName: 'id' })
  character: Character;

  /**
   * Foreign key reference to the staff member (voice actor) who voices this character.
   * BIGINT type to match Snowflake ID format.
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to staffs.id',
  })
  staffId: string;

  /**
   * Staff member (voice actor) information.
   * Many-to-One relationship with Staff entity.
   * When a staff member is deleted, all their character relationships are cascaded (CASCADE delete).
   */
  @ManyToOne(() => Staff, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staffId', referencedColumnName: 'id' })
  staff: Staff;

  /**
   * Language of the voice acting.
   * VARCHAR(50) NULL - language code or name.
   * Examples: 'Japanese', 'English', 'Korean', 'Spanish', etc.
   * Used to distinguish between different language dubs for the same character.
   * A character can have multiple voice actors for different languages.
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Language of the voice acting (e.g., Japanese, English)',
  })
  language?: string;

  /**
   * Whether this is the primary/main voice actor for this character.
   * BOOLEAN DEFAULT FALSE - indicates if this is the primary voice actor.
   * Used for display purposes and filtering.
   * Typically the original language voice actor is marked as primary.
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this is the primary/main voice actor for this character',
  })
  isPrimary: boolean;

  /**
   * Sort order for displaying voice actors in lists.
   * INT DEFAULT 0 - determines the display order of voice actors for a character.
   * Lower values appear first. Primary voice actor typically has sortOrder = 0.
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Sort order for displaying voice actors in lists',
  })
  sortOrder: number;

  /**
   * Notes regarding the voice actor's role for the character.
   * TEXT NULL - optional notes about the voice acting.
   * Examples: "Original Japanese voice", "English dub", "Special appearance"
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: "Notes regarding the voice actor's role for the character",
  })
  notes?: string;

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
