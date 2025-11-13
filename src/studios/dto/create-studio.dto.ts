import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { STUDIO_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for creating a new studio
 * Based on AniList API Studio object: https://docs.anilist.co/reference/object/studio
 */
export class CreateStudioDto {
  /**
   * The MAL id of the studio
   * MyAnimeList ID for cross-reference
   */
  @IsOptional()
  @IsString()
  myAnimeListId?: string;

  /**
   * The AniList id of the studio
   * AniList ID for cross-reference
   */
  @IsOptional()
  @IsString()
  aniListId?: string;

  /**
   * The name of the studio
   * Required field
   */
  @IsString()
  @MaxLength(STUDIO_CONSTANTS.NAME_MAX_LENGTH)
  name: string;

  /**
   * If the studio is an animation studio or a different kind of company
   * Values: 'animation_studio' | 'production_company'
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(STUDIO_CONSTANTS.TYPES))
  type?: string;

  /**
   * URL for the studio page on the AniList website
   */
  @IsOptional()
  @IsString()
  @MaxLength(STUDIO_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  /**
   * Studio status
   * Values: 'active' | 'inactive' | 'pending' | 'archived'
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(STUDIO_CONSTANTS.STATUS))
  status?: string;

  /**
   * Additional metadata for studio
   * JSON field for storing structured data
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
