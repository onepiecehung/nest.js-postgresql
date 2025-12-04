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
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CreateSegmentDto, QuerySegmentDto, UpdateSegmentDto } from './dto';
import { QuerySegmentCursorDto } from './dto/query-segment-cursor.dto';
import { SegmentsService } from './services/segments.service';

/**
 * Segments Controller
 *
 * Handles HTTP requests for series segments (episodes/chapters).
 * Provides CRUD operations and additional query endpoints.
 * All routes are at the top-level /segments path
 */
@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  /**
   * Create a new segment for a series
   * Requires authentication
   * @param createSegmentDto Segment creation data (must include seriesId)
   * @returns Created segment entity
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSegmentDto: CreateSegmentDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.segmentsService.create({
      ...createSegmentDto,
      userId: req.user.uid,
    });
  }

  /**
   * Get all segments with offset pagination
   * Supports filtering by various criteria including seriesId
   * @param queryDto Query parameters with filters and pagination
   * @returns Paginated list of segments
   */
  @Get()
  async findAll(@Query() queryDto: QuerySegmentDto) {
    // If seriesId is provided in query, filter by series; otherwise get all segments
    if (queryDto.seriesId) {
      return this.segmentsService.findBySeriesId(queryDto.seriesId, queryDto);
    }
    return this.segmentsService.findAll(queryDto);
  }

  /**
   * Get all segments with cursor pagination
   * Better for real-time feeds and infinite scroll
   * @param paginationDto Cursor pagination parameters (can include seriesId in query)
   * @returns Cursor-paginated list of segments
   */
  @Get('cursor')
  async findAllCursor(@Query() paginationDto: QuerySegmentCursorDto) {
    // If seriesId is provided in query, filter by series; otherwise get all segments
    if (paginationDto.seriesId) {
      return this.segmentsService.findBySeriesIdCursor(
        paginationDto.seriesId,
        paginationDto,
      );
    }
    return this.segmentsService.findAllCursor(paginationDto);
  }

  /**
   * Get a segment by number
   * Useful for finding a specific episode/chapter in a series
   * @param number Segment number
   * @param seriesId Series ID (Snowflake ID) - required query parameter
   * @param subNumber Optional sub-number for .5 episodes/chapters
   * @returns Segment entity or null if not found
   */
  @Get('number/:number')
  async findBySeriesAndNumber(
    @Param('number') number: string,
    @Query('seriesId', SnowflakeIdPipe) seriesId: string,
    @Query('subNumber') subNumber?: string,
  ) {
    if (!seriesId) {
      throw new BadRequestException('Series ID is required');
    }

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
   * @param number Current segment number
   * @param seriesId Series ID (Snowflake ID) - required query parameter
   * @param subNumber Optional current sub-number
   * @returns Next segment or null if not found
   */
  @Get('number/:number/next')
  async getNextSegment(
    @Param('number') number: string,
    @Query('seriesId', SnowflakeIdPipe) seriesId: string,
    @Query('subNumber') subNumber?: string,
  ) {
    if (!seriesId) {
      throw new BadRequestException('Series ID is required');
    }

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
   * @param number Current segment number
   * @param seriesId Series ID (Snowflake ID) - required query parameter
   * @param subNumber Optional current sub-number
   * @returns Previous segment or null if not found
   */
  @Get('number/:number/previous')
  async getPreviousSegment(
    @Param('number') number: string,
    @Query('seriesId', SnowflakeIdPipe) seriesId: string,
    @Query('subNumber') subNumber?: string,
  ) {
    if (!seriesId) {
      throw new BadRequestException('Series ID is required');
    }

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
   * @param id Segment ID (Snowflake ID)
   * @returns Segment entity or null if not found
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.segmentsService.findById(id);
  }

  /**
   * Update a segment
   * Requires authentication
   * @param id Segment ID (Snowflake ID)
   * @param updateSegmentDto Segment update data
   * @returns Updated segment entity
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateSegmentDto: UpdateSegmentDto,
  ) {
    // Note: seriesId in updateSegmentDto will be ignored by service
    // as it's not allowed to change the parent series
    return this.segmentsService.update(id, updateSegmentDto);
  }

  /**
   * Delete a segment (soft delete)
   * Requires authentication
   * @param id Segment ID (Snowflake ID)
   * @returns No content on success
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.segmentsService.softDelete(id);
  }
}
