import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for linking a character to a staff with role information
 * Based on AniList API StaffRoleType: https://docs.anilist.co/reference/object/staffroletype
 */
export class CharacterRoleDto {
  /**
   * ID of the character to link
   */
  @IsString()
  characterId: string;

  /**
   * Notes regarding the VA's role for the character
   * Examples: "Main character", "Supporting role", "Narrator"
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleNotes?: string;

  /**
   * Used for grouping roles where multiple dubs exist for the same language
   * Either dubbing company name or language variant
   * Examples: "Funimation", "Crunchyroll", "Japanese", "English"
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dubGroup?: string;
}

/**
 * DTO for linking multiple characters to a staff
 */
export class LinkCharactersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterRoleDto)
  characters: CharacterRoleDto[];
}
