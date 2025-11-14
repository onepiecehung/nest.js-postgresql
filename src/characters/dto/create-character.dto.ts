import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';

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
 * DTO for creating a new character
 */
export class CreateCharacterDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterNameDto)
  name?: CharacterNameDto;

  @IsOptional()
  @IsString()
  imageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHARACTER_CONSTANTS.GENDER_MAX_LENGTH)
  gender?: string;

  @IsOptional()
  @IsDate()
  dateOfBirth?: Date;

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
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
