import { Type } from 'class-transformer';
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
import {
  StaffNameDto,
  StaffImageDto,
  YearsActiveDto,
} from './create-staff.dto';
import { FuzzyDateDto } from 'src/characters/dto/create-character.dto';
import { CharacterRoleDto } from './link-character.dto';

/**
 * DTO for updating an existing staff
 * All fields are optional
 */
export class UpdateStaffDto {
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
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterRoleDto)
  characters?: CharacterRoleDto[]; // Characters to link/unlink with role information

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
