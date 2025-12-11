import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating a scope permission
 */
export class UpdateScopePermissionDto {
  /**
   * Allow permissions bitmask
   */
  @IsString()
  @IsOptional()
  allowPermissions?: string;

  /**
   * Deny permissions bitmask
   */
  @IsString()
  @IsOptional()
  denyPermissions?: string;

  /**
   * Optional reason for this scope permission
   */
  @IsString()
  @IsOptional()
  reason?: string;

  /**
   * When this permission expires
   */
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
