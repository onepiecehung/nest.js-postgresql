import { instanceToPlain } from 'class-transformer';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';
import { Character } from 'src/characters/entities/character.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Series } from './series.entity';

/**
 * Series Character Entity
 *
 * Junction entity representing the relationship between Series and Characters.
 * Based on AniList API MediaCharacter and CharacterRole.
 * Stores additional information about the character's role in the series.
 */
@Entity('series_characters')
@Unique(['seriesId', 'characterId', 'role']) // Prevent duplicate roles
@Index(['seriesId'])
@Index(['characterId'])
@Index(['role'])
export class SeriesCharacter extends BaseEntityCustom {
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
   * ID of the character
   * Links to characters table
   */
  @Column({ type: 'bigint', nullable: false })
  characterId: string;

  /**
   * Character information
   * Many-to-One relationship with Character entity
   */
  @ManyToOne(() => Character, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'characterId', referencedColumnName: 'id' })
  character: Character;

  /**
   * Role of the character in the series
   * Examples: 'MAIN', 'SUPPORTING', 'BACKGROUND'
   * Based on AniList API CharacterRole enum
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  role?: string;

  /**
   * Notes regarding the character's role in the series
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  roleNotes?: string;

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    return result;
  }
}
