import { PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';

/**
 * DTO for updating an existing staff
 * Extends CreateStaffDto with all fields optional
 */
export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
