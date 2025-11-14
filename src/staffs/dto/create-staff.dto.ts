import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { COUNTRY_CODES, STAFF_CONSTANTS } from 'src/shared/constants';
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
 * DTO for creating a new staff
 */
export class CreateStaffDto {
  /**
   * The MAL id of the staff
   * MyAnimeList ID for cross-reference
   */
  @IsOptional()
  @IsString()
  myAnimeListId?: string;

  /**
   * The AniList id of the staff
   * AniList ID for cross-reference
   */
  @IsOptional()
  @IsString()
  aniListId?: string;

  /**
   * Staff names in different languages and formats
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffNameDto)
  name?: StaffNameDto;

  /**
   * The primary language of the staff member
   */
  @IsOptional()
  @IsString()
  @IsIn(COUNTRY_CODES.map((country) => country.code))
  language?: string;

  /**
   * The ID of the staff image
   */
  @IsOptional()
  @IsString()
  imageId?: string;

  /**
   * General description of the staff member
   * Can be in markdown format
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  /**
   * The person's primary occupations
   * Examples: ['Voice Actor', 'Director', 'Producer', 'Composer']
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(STAFF_CONSTANTS.OCCUPATION_MAX_LENGTH, { each: true })
  primaryOccupations?: string[];

  /**
   * Staff's gender
   * Usually Male, Female, or Non-binary but can be any string
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.GENDER_MAX_LENGTH)
  @IsIn(Object.values(STAFF_CONSTANTS.GENDER))
  gender?: string;

  /**
   * Staff's birth date
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;

  /**
   * Staff's death date
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfDeath?: Date;

  /**
   * The person's age in years
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  /**
   * The staff's debut date
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  debutDate?: Date;

  /**
   * The person's birthplace or hometown
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.HOME_TOWN_MAX_LENGTH)
  homeTown?: string;

  /**
   * The person's blood type
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.BLOOD_TYPE_MAX_LENGTH)
  @IsIn(Object.values(STAFF_CONSTANTS.BLOOD_TYPES))
  bloodType?: string;

  /**
   * URL for the staff page on the website
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.SITE_URL_MAX_LENGTH)
  siteUrl?: string;

  /**
   * Notes for site moderators
   */
  @IsOptional()
  @IsString()
  @MaxLength(STAFF_CONSTANTS.MOD_NOTES_MAX_LENGTH)
  notes?: string;

  /**
   * Staff status
   * Values: 'active' | 'inactive' | 'pending' | 'archived'
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(STAFF_CONSTANTS.STATUS))
  status?: string;

  /**
   * Characters to link with role information
   * This is for convenience when creating staff with character links
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterRoleDto)
  characters?: CharacterRoleDto[];

  /**
   * Additional metadata for staff
   * JSON field for storing structured data
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
