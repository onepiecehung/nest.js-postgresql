import { instanceToPlain } from 'class-transformer';
import { Character } from 'src/characters/entities/character.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Staff } from './staff.entity';

/**
 * Staff Character Entity
 *
 * Junction entity representing the relationship between Staff (voice actors) and Characters.
 * Based on AniList API StaffRoleType object: https://docs.anilist.co/reference/object/staffroletype
 *
 * This entity stores additional information about the voice actor's role for a character,
 * including role notes and dub group information.
 */
@Entity('staff_characters')
@Unique(['staffId', 'characterId', 'dubGroup']) // Prevent duplicate roles with same dub group
@Index(['staffId'])
@Index(['characterId'])
@Index(['dubGroup'])
export class StaffCharacter extends BaseEntityCustom {
  /**
   * ID of the staff member (voice actor)
   * Links to staffs table
   */
  @Column({ type: 'bigint', nullable: false })
  staffId: string;

  /**
   * Staff information (voice actor)
   * Many-to-One relationship with Staff entity
   */
  @ManyToOne(() => Staff, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staffId', referencedColumnName: 'id' })
  staff: Staff;

  /**
   * ID of the character being voiced
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
   * Notes regarding the VA's role for the character
   * Examples: "Main character", "Supporting role", "Narrator", etc.
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  roleNotes?: string;

  /**
   * Used for grouping roles where multiple dubs exist for the same language
   * Either dubbing company name or language variant
   * Examples: "Funimation", "Crunchyroll", "Japanese", "English", etc.
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  dubGroup?: string;

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    return result;
  }
}
