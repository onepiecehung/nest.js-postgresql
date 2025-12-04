import { PartialType } from '@nestjs/mapped-types';
import { CreateSegmentDto } from './create-segment.dto';

/**
 * DTO for updating an existing segment
 * Extends CreateSegmentDto with all fields optional
 */
export class UpdateSegmentDto extends PartialType(CreateSegmentDto) {}
