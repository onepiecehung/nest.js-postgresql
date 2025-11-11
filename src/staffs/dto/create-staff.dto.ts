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
import { STAFF_CONSTANTS } from 'src/shared/constants';
import { FuzzyDateDto } from 'src/characters/dto/create-character.dto';
import { CharacterRoleDto } from './link-character.dto';

/**
 * DTO for creating a staff name
 * Based on AniList API StaffName object: https://docs.anilist.co/reference/object/staffname
 */
export class StaffNameDto {
  /**
   * The person's given name
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH)
  first?: string;

  /**
   * The person's middle name
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH)
  middle?: string;

  /**
   * The person's surname
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH)
  last?: string;

  /**
   * The person's first and last name
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH)
  full?: string;

  /**
   * The person's full name in their native language
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH)
  native?: string;

  /**
   * Other names the staff member might be referred to as (pen names)
   * Array of alternative names
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH, { each: true })
  alternative?: string[];

  /**
   * The currently authenticated user's preferred name language
   * Default romaji for non-authenticated users
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.NAME_MAX_LENGTH)
  userPreferred?: string;
}

/**
 * DTO for creating staff images
 */
export class StaffImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.SITE_URL_MAX_LENGTH)
  large?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.SITE_URL_MAX_LENGTH)
  medium?: string;
}

/**
 * DTO for years active
 */
export class YearsActiveDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear?: number;
}

/**
 * DTO for creating a new staff
 */
export class CreateStaffDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffNameDto)
  name?: StaffNameDto;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.LANGUAGE_MAX_LENGTH)
  @IsIn(Object.values(STAFF_CONSTANTS.LANGUAGES))
  languageV2?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffImageDto)
  image?: StaffImageDto;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(STAFF_CONSTANTS.OCCUPATION_MAX_LENGTH, { each: true })
  primaryOccupations?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.GENDER_MAX_LENGTH)
  gender?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  dateOfBirth?: FuzzyDateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FuzzyDateDto)
  dateOfDeath?: FuzzyDateDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => YearsActiveDto)
  yearsActive?: YearsActiveDto;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.HOME_TOWN_MAX_LENGTH)
  homeTown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.BLOOD_TYPE_MAX_LENGTH)
  bloodType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.MOD_NOTES_MAX_LENGTH)
  modNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterRoleDto)
  characters?: CharacterRoleDto[]; // Characters to link with role information

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
