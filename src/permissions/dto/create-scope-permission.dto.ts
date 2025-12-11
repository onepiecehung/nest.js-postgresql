import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO for creating a scope permission
 */
export class CreateScopePermissionDto {
  /**
   * Type of scope (e.g., 'organization', 'team', 'project')
   */
  @IsString()
  @IsNotEmpty()
  scopeType: string;

  /**
   * ID of the scope resource
   */
  @IsString()
  @IsNotEmpty()
  scopeId: string;

  /**
   * Allow permissions bitmask (optional, defaults to 0)
   */
  @IsString()
  @IsOptional()
  allowPermissions?: string;

  /**
   * Deny permissions bitmask (optional, defaults to 0)
   */
  @IsString()
  @IsOptional()
  denyPermissions?: string;

  /**
   * Optional PermissionKey for single permission grants
   */
  @IsString()
  @IsOptional()
  permissionKey?: string;

  /**
   * Optional reason for this scope permission
   */
  @IsString()
  @IsOptional()
  reason?: string;

  /**
   * ID of the user who granted this permission
   */
  @IsString()
  @IsOptional()
  grantedBy?: string;

  /**
   * When this permission expires (optional)
   */
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
