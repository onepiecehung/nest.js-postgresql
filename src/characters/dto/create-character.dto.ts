import { Transform, Type } from 'class-transformer';
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
  CharacterName,
  CharacterImage,
  FuzzyDate,
} from 'src/characters/entities/character.entity';

/**
 * DTO for creating a character name
 */
export class CharacterNameDto {
  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH)
  first?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH)
  middle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH)
  last?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH)
  full?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH)
  native?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH, { each: true })
  alternative?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH, { each: true })
  alternativeSpoiler?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.NAME_MAX_LENGTH)
  userPreferred?: string;
}

/**
 * DTO for creating character images
 */
export class CharacterImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.SITE_URL_MAX_LENGTH)
  large?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.SITE_URL_MAX_LENGTH)
  medium?: string;
}

/**
 * DTO for fuzzy date (date of birth)
 */
export class FuzzyDateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;
}

/**
 * DTO for creating a new character
 */
export class CreateCharacterDto {
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
  @IsObject()
  metadata?: Record<string, unknown>;
}
