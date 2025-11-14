import { IntersectionType, PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateAuthorDto } from './create-author.dto';

/**
 * Additional fields for UpdateAuthorDto that are not in CreateAuthorDto
 */
class UpdateAuthorFieldsDto {
  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * DTO for updating an existing author
 * Extends CreateAuthorDto with all fields optional, plus additional update-specific fields
 */
export class UpdateAuthorDto extends IntersectionType(
  PartialType(CreateAuthorDto),
  UpdateAuthorFieldsDto,
) {}
