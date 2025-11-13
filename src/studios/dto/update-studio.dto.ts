import { PartialType } from '@nestjs/mapped-types';
import { CreateStudioDto } from './create-studio.dto';

/**
 * DTO for updating an existing studio
 * Extends CreateStudioDto with all fields optional
 */
export class UpdateStudioDto extends PartialType(CreateStudioDto) {}
