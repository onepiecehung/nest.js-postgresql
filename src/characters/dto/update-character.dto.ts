import { IntersectionType, OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCharacterDto } from './create-character.dto';

/**
 * Additional fields for UpdateCharacterDto that differ from CreateCharacterDto
 */
class UpdateCharacterFieldsDto {}

/**
 * DTO for updating an existing character
 * Extends CreateCharacterDto with all fields optional, plus additional update-specific fields
 * Note: Uses OmitType to exclude imageId and dateOfBirth from CreateCharacterDto
 * since UpdateCharacterDto may handle these differently (e.g., with nested DTOs)
 */
export class UpdateCharacterDto extends IntersectionType(
  PartialType(
    OmitType(CreateCharacterDto, ['imageId', 'dateOfBirth'] as const),
  ),
  UpdateCharacterFieldsDto,
) {
  // Override imageId to support nested image DTO if needed
  // If you need to support CharacterImageDto, you can add it here
  // For now, keeping it simple by omitting from base and allowing direct assignment
  // Override dateOfBirth to support FuzzyDateDto if needed
  // If you need to support FuzzyDateDto, you can add it here
  // For now, keeping it simple by omitting from base and allowing direct assignment
}
