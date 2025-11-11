import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';
import { STUDIO_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for creating a new studio
 * Based on AniList API Studio object: https://docs.anilist.co/reference/object/studio
 */
export class CreateStudioDto {
  /**
   * The name of the studio
   * Required field
   */
  @IsString()
  @MaxLength(STUDIO_CONSTANTS.NAME_MAX_LENGTH)
  name: string;

  /**
   * If the studio is an animation studio or a different kind of company
   * true = animation studio, false = production company or other
   */
  @IsOptional()
  @IsBoolean()
  isAnimationStudio?: boolean;

  /**
   * URL for the studio page on the AniList website
   */
  @IsOptional()
  @IsString()
  @MaxLength(STUDIO_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
