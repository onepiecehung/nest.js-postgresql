import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for querying effective permissions for a user
 */
export class EffectivePermissionsDto {
  @ApiPropertyOptional({
    description: 'ID of the user to check permissions for',
    example: '1234567890123456789',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
