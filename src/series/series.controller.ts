import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { SeriesService } from './series.service';
import { CreateSeriesDto, UpdateSeriesDto, QuerySeriesDto } from './dto';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /**
   * Create a new series
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSeriesDto: CreateSeriesDto) {
    return this.seriesService.create(createSeriesDto);
  }

  /**
   * Get all series with offset pagination
   */
  @Get()
  async findAll(@Query() queryDto: QuerySeriesDto) {
    return this.seriesService.findAll(queryDto);
  }

  /**
   * Get all series with cursor pagination
   */
  @Get('cursor')
  async findAllCursor(@Query() paginationDto: CursorPaginationDto) {
    return this.seriesService.findAllCursor(paginationDto);
  }

  /**
   * Get a series by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.seriesService.findById(id);
  }

  /**
   * Update a series
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateSeriesDto: UpdateSeriesDto,
  ) {
    return this.seriesService.update(id, updateSeriesDto);
  }

  /**
   * Delete a series (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.seriesService.softDelete(id);
  }

  /**
   * Get a series by ID with reaction counts
   */
  @Get(':id/reactions')
  async findOneWithReactions(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query('kinds') kinds?: string,
  ) {
    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.seriesService.findByIdWithReactions(id, kindsArray);
  }
}
