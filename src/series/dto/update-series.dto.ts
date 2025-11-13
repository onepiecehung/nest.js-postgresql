import { PartialType } from '@nestjs/mapped-types';
import { CreateSeriesDto } from './create-series.dto';

/**
 * DTO for updating an existing series
 * Extends CreateSeriesDto with all fields optional
 */
export class UpdateSeriesDto extends PartialType(CreateSeriesDto) {}
