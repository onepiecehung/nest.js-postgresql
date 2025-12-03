import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { CursorPaginationDto } from 'src/common/dto';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CreateSegmentDto, QuerySegmentDto, UpdateSegmentDto } from './dto';
import { SegmentsService } from './services/segments.service';

/**
 * Segments Controller
 *
 * Handles HTTP requests for series segments (episodes/chapters).
 * Provides CRUD operations and additional query endpoints.
 * All routes are nested under series/:seriesId/segments
 */
@Controller('series/:seriesId/segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  /**
   * Create a new segment for a series
   * Requires authentication
   * @param seriesId Series ID (Snowflake ID)
   * @param createSegmentDto Segment creation data
   * @returns Created segment entity
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Body() createSegmentDto: CreateSegmentDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.segmentsService.create({
      ...createSegmentDto,
      seriesId,
      userId: req.user.uid,
    });
  }

  /**
   * Get all segments for a series with offset pagination
   * Supports filtering by various criteria
   * @param seriesId Series ID (Snowflake ID)
   * @param queryDto Query parameters with filters and pagination
   * @returns Paginated list of segments for the series
   */
  @Get()
  async findAll(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Query() queryDto: QuerySegmentDto,
  ) {
    return this.segmentsService.findBySeriesId(seriesId, queryDto);
  }

  /**
   * Get all segments for a series with cursor pagination
   * Better for real-time feeds and infinite scroll
   * @param seriesId Series ID (Snowflake ID)
   * @param paginationDto Cursor pagination parameters
   * @returns Cursor-paginated list of segments for the series
   */
  @Get('cursor')
  async findAllCursor(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Query() paginationDto: CursorPaginationDto,
  ) {
    return this.segmentsService.findBySeriesIdCursor(seriesId, paginationDto);
  }

  /**
   * Get a segment by number
   * Useful for finding a specific episode/chapter in a series
   * @param seriesId Series ID (Snowflake ID)
   * @param number Segment number
   * @param subNumber Optional sub-number for .5 episodes/chapters
   * @returns Segment entity or null if not found
   */
  @Get('number/:number')
  async findBySeriesAndNumber(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Param('number') number: string,
    @Query('subNumber') subNumber?: string,
  ) {
    const numberInt = Number.parseInt(number, 10);
    const subNumberInt = subNumber ? Number.parseInt(subNumber, 10) : undefined;

    if (Number.isNaN(numberInt)) {
      throw new BadRequestException('Invalid segment number');
    }

    if (subNumber && Number.isNaN(subNumberInt)) {
      throw new BadRequestException('Invalid sub-number');
    }

    return this.segmentsService.findBySeriesAndNumber(
      seriesId,
      numberInt,
      subNumberInt,
    );
  }

  /**
   * Get the next segment in a series
   * Returns the segment that comes after the specified segment
   * @param seriesId Series ID (Snowflake ID)
   * @param number Current segment number
   * @param subNumber Optional current sub-number
   * @returns Next segment or null if not found
   */
  @Get('number/:number/next')
  async getNextSegment(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Param('number') number: string,
    @Query('subNumber') subNumber?: string,
  ) {
    const numberInt = Number.parseInt(number, 10);
    const subNumberInt = subNumber ? Number.parseInt(subNumber, 10) : undefined;

    if (Number.isNaN(numberInt)) {
      throw new BadRequestException('Invalid segment number');
    }

    if (subNumber && Number.isNaN(subNumberInt)) {
      throw new BadRequestException('Invalid sub-number');
    }

    return this.segmentsService.getNextSegment(
      seriesId,
      numberInt,
      subNumberInt,
    );
  }

  /**
   * Get the previous segment in a series
   * Returns the segment that comes before the specified segment
   * @param seriesId Series ID (Snowflake ID)
   * @param number Current segment number
   * @param subNumber Optional current sub-number
   * @returns Previous segment or null if not found
   */
  @Get('number/:number/previous')
  async getPreviousSegment(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Param('number') number: string,
    @Query('subNumber') subNumber?: string,
  ) {
    const numberInt = Number.parseInt(number, 10);
    const subNumberInt = subNumber ? Number.parseInt(subNumber, 10) : undefined;

    if (Number.isNaN(numberInt)) {
      throw new BadRequestException('Invalid segment number');
    }

    if (subNumber && Number.isNaN(subNumberInt)) {
      throw new BadRequestException('Invalid sub-number');
    }

    return this.segmentsService.getPreviousSegment(
      seriesId,
      numberInt,
      subNumberInt,
    );
  }

  /**
   * Get a segment by ID
   * @param seriesId Series ID (Snowflake ID)
   * @param id Segment ID (Snowflake ID)
   * @returns Segment entity or null if not found
   */
  @Get(':id')
  async findOne(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Param('id', SnowflakeIdPipe) id: string,
  ) {
    // Verify that the segment belongs to the specified series
    const segment = await this.segmentsService.findById(id);
    if (!segment) {
      return null;
    }
    if (segment.seriesId !== seriesId) {
      throw new BadRequestException(
        'Segment does not belong to the specified series',
      );
    }
    return segment;
  }

  /**
   * Update a segment
   * Requires authentication
   * @param seriesId Series ID (Snowflake ID)
   * @param id Segment ID (Snowflake ID)
   * @param updateSegmentDto Segment update data
   * @returns Updated segment entity
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateSegmentDto: UpdateSegmentDto,
  ) {
    // Verify that the segment belongs to the specified series
    const segment = await this.segmentsService.findById(id);
    if (!segment) {
      throw new BadRequestException('Segment not found');
    }
    if (segment.seriesId !== seriesId) {
      throw new BadRequestException(
        'Segment does not belong to the specified series',
      );
    }
    // Note: seriesId in updateSegmentDto will be ignored by service
    // as it's not allowed to change the parent series
    return this.segmentsService.update(id, updateSegmentDto);
  }

  /**
   * Delete a segment (soft delete)
   * Requires authentication
   * @param seriesId Series ID (Snowflake ID)
   * @param id Segment ID (Snowflake ID)
   * @returns No content on success
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
    @Param('id', SnowflakeIdPipe) id: string,
  ) {
    // Verify that the segment belongs to the specified series
    const segment = await this.segmentsService.findById(id);
    if (!segment) {
      throw new BadRequestException('Segment not found');
    }
    if (segment.seriesId !== seriesId) {
      throw new BadRequestException(
        'Segment does not belong to the specified series',
      );
    }
    return this.segmentsService.softDelete(id);
  }
}
