import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { AUTHOR_CONSTANTS } from 'src/shared/constants';
import { AuthorNameDto, SeriesRoleDto } from './create-author.dto';
import { FuzzyDateDto } from 'src/characters/dto/create-character.dto';

/**
 * DTO for updating an existing author
 * All fields are optional
 */
export class UpdateAuthorDto {
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
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeriesRoleDto)
  series?: SeriesRoleDto[]; // Series to link/unlink with role information

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
