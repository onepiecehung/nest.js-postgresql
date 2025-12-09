import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PermissionName } from 'src/shared/constants';

/**
 * DTO for revoking a permission from a user for a specific segment
 */
export class RevokeSegmentPermissionDto {
  @ApiProperty({
    description: 'ID of the user to revoke permission from',
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
    description: 'Permission name to revoke',
    example: 'SEGMENTS_UPDATE',
    enum: ['SEGMENTS_UPDATE', 'SEGMENTS_CREATE'] as PermissionName[],
  })
  @IsEnum(['SEGMENTS_UPDATE', 'SEGMENTS_CREATE'] as any)
  permission: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE';
}
