import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';
import { FuzzyDateDto } from 'src/characters/dto/create-character.dto';

/**
 * DTO for creating an author name
 */
export class AuthorNameDto {
  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH)
  first?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH)
  middle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH)
  last?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH)
  full?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH)
  native?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH, { each: true })
  alternative?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NAME_MAX_LENGTH)
  userPreferred?: string;
}

/**
 * DTO for creating a new author
 */
export class CreateAuthorDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorNameDto)
  name?: AuthorNameDto;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  birthDate?: FuzzyDateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  deathDate?: FuzzyDateDto;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.NATIONALITY_MAX_LENGTH)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.WEBSITE_MAX_LENGTH)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(AUTHOR_CONSTANTS.MOD_NOTES_MAX_LENGTH)
  modNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeriesRoleDto)
  series?: SeriesRoleDto[]; // Series to link with role information

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for series role information when linking to author
 */
export class SeriesRoleDto {
  @IsString()
  seriesId: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(AUTHOR_CONSTANTS.ROLES))
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleNotes?: string;

  @IsOptional()
  @Type(() => Boolean)
  isMain?: boolean;
}
