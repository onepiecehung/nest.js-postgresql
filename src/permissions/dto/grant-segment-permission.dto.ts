import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PermissionName } from 'src/shared/constants';

/**
 * DTO for granting a permission to a user for a specific segment
 */
export class GrantSegmentPermissionDto {
  @ApiProperty({
    description: 'ID of the user to grant permission to',
    example: '1234567890123456789',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'ID of the segment this permission applies to',
    example: '9876543210987654321',
  })
  @IsString()
  segmentId: string;

  @ApiProperty({
    description: 'Permission name to grant',
    example: 'SEGMENTS_UPDATE',
    enum: ['SEGMENTS_UPDATE', 'SEGMENTS_CREATE'] as PermissionName[],
  })
  @IsEnum(['SEGMENTS_UPDATE', 'SEGMENTS_CREATE'] as any)
  permission: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE';

  @ApiPropertyOptional({
    description: 'Reason for granting this permission (for audit purposes)',
    example: 'User assigned as segment editor',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who is granting this permission',
    example: '1111111111111111111',
  })
  @IsOptional()
  @IsString()
  grantedBy?: string;

  @ApiPropertyOptional({
    description: 'Expiration date for this permission (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

