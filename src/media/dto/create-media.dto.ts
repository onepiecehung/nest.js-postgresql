import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType, MediaStatus, MEDIA_CONSTANTS } from 'src/shared/constants';

export class CreateMediaDto {
  @ApiProperty({ description: 'Media name', example: 'profile-picture.jpg' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Media title',
    example: 'User Profile Picture',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Alt text for accessibility',
    example: 'User profile picture',
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({
    description: 'Media description',
    example: 'Profile picture for user account',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Media type',
    enum: Object.values(MEDIA_CONSTANTS.TYPES),
  })
  @IsOptional()
  @IsEnum(MEDIA_CONSTANTS.TYPES)
  type?: MediaType;

  @ApiPropertyOptional({
    description: 'Media status',
    enum: Object.values(MEDIA_CONSTANTS.STATUS),
  })
  @IsOptional()
  @IsEnum(MEDIA_CONSTANTS.STATUS)
  status?: MediaStatus;

  @ApiPropertyOptional({
    description: 'Whether media is public',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Media tags as JSON string',
    example: '["profile", "avatar", "user"]',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Media width in pixels', example: 1920 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Media height in pixels', example: 1080 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description: 'Media duration in seconds (for video/audio)',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Media path',
    example: 'media/1234567890_123456789.jpg',
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    description: 'Media URL',
    example: 'https://example.com/media/1234567890_123456789.jpg',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media key for storage',
    example: 'media/1234567890_123456789.jpg',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Original file name',
    example: 'profile-picture.jpg',
  })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL',
    example: 'https://example.com/thumbnails/1234567890_123456789.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Preview URL',
    example: 'https://example.com/previews/1234567890_123456789.jpg',
  })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiPropertyOptional({ description: 'Storage provider', example: 'local' })
  @IsOptional()
  @IsString()
  storageProvider?: string;

  @ApiPropertyOptional({ description: 'Download count', example: 0 })
  @IsOptional()
  @IsNumber()
  downloadCount?: number;

  @ApiPropertyOptional({ description: 'View count', example: 0 })
  @IsOptional()
  @IsNumber()
  viewCount?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON string',
    example: '{"imageScrambler":{"enabled":true,"version":1}}',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}
