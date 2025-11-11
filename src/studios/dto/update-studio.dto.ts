import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';
import { STUDIO_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for updating an existing studio
 * All fields are optional
 */
export class UpdateStudioDto {
  @IsOptional()
  @IsString()
  @MaxLength(STUDIO_CONSTANTS.NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isAnimationStudio?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(STUDIO_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
