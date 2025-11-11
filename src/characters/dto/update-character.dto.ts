import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';
import {
  CharacterNameDto,
  CharacterImageDto,
  FuzzyDateDto,
} from './create-character.dto';

/**
 * DTO for updating an existing character
 * All fields are optional
 */
export class UpdateCharacterDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterNameDto)
  name?: CharacterNameDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterImageDto)
  image?: CharacterImageDto;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.GENDER_MAX_LENGTH)
  gender?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  dateOfBirth?: FuzzyDateDto;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.AGE_MAX_LENGTH)
  age?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.BLOOD_TYPE_MAX_LENGTH)
  bloodType?: string;

  @IsOptional()
  @IsBoolean()
  isFavouriteBlocked?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.MOD_NOTES_MAX_LENGTH)
  modNotes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
