import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PermissionKey } from 'src/permissions/types/permission-key.type';

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
    description: 'PermissionKey to revoke',
    example: 'segment.update',
  })
  @IsString()
  permission: PermissionKey;
}
