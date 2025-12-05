import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { ORGANIZATION_CONSTANTS } from 'src/shared/constants';

/**
 * Create Organization DTO
 *
 * Data transfer object for creating new organizations
 */
export class CreateOrganizationDto {
  /**
   * Organization name
   * Required field with length constraints
   */
  @IsString()
  @Length(1, ORGANIZATION_CONSTANTS.NAME_MAX_LENGTH)
  name: string;

  /**
   * URL-friendly slug for the organization
   * Must be unique across all organizations
   * If not provided, will be generated from name
   */
  @IsOptional()
  @IsString()
  @MaxLength(ORGANIZATION_CONSTANTS.SLUG_MAX_LENGTH)
  slug?: string;

  /**
   * Organization description
   * Optional field for additional information about the organization
   */
  @IsOptional()
  @IsString()
  @MaxLength(ORGANIZATION_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  /**
   * Organization website URL
   * Optional field for the organization's website
   */
  @IsOptional()
  @IsUrl()
  @MaxLength(ORGANIZATION_CONSTANTS.WEBSITE_URL_MAX_LENGTH)
  websiteUrl?: string;

  /**
   * Organization logo image URL
   * Optional field for the organization's logo
   */
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  logoUrl?: string;

  /**
   * Organization visibility level
   * Controls who can view and discover the organization
   * Defaults to public if not specified
   */
  @IsOptional()
  @IsEnum(ORGANIZATION_CONSTANTS.VISIBILITY)
  visibility?: (typeof ORGANIZATION_CONSTANTS.VISIBILITY)[keyof typeof ORGANIZATION_CONSTANTS.VISIBILITY];

  /**
   * Owner user ID
   * Required field - the user who creates the organization becomes the owner
   */
  @IsString()
  @IsOptional()
  ownerId?: string;

  /**
   * Organization logo image ID
   * Optional field for the organization's logo
   */
  @IsOptional()
  @IsString()
  logoId?: string;
}
