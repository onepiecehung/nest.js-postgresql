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
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { CursorPaginationDto } from 'src/common/dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CreateSeriesDto, QuerySeriesDto, UpdateSeriesDto } from './dto';
import { SeriesService } from './series.service';
import { AniListCrawlService } from './services/anilist-crawl.service';

@Controller('series')
export class SeriesController {
  constructor(
    private readonly seriesService: SeriesService,
    private readonly anilistCrawlService: AniListCrawlService,
  ) {}

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
   * Trigger crawl job for AniList media
   * Sends job to queue for asynchronous processing
   * Worker will crawl all pages and save media directly to database
   *
   * @param type - Media type to crawl (ANIME or MANGA), defaults to ANIME
   * @returns Job ID and status
   */
  @Get('anilist/crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerCrawl(@Query('type') type?: 'ANIME' | 'MANGA') {
    // Validate and set default type
    const mediaType = type || 'ANIME';
    if (mediaType !== 'ANIME' && mediaType !== 'MANGA') {
      throw new BadRequestException(
        'Invalid type. Must be either ANIME or MANGA.',
      );
    }

    // Send crawl job to queue (will crawl all pages)
    const jobId = await this.anilistCrawlService.crawlAniListMedia(mediaType);

    return {
      success: true,
      jobId,
      type: mediaType,
      message: `Crawl job queued successfully. Worker will process all pages of ${mediaType} media.`,
    };
  }

  /**
   * Get media list from AniList API
   * Fetches paginated list of media (anime and manga) from AniList
   *
   * @param page - Page number (default: 1)
   * @param perPage - Items per page (default: 50, max: 50)
   * @returns AniList page data with media list
   */
  @Get('anilist')
  async getAniListMediaList(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    // Parse and validate page
    let pageNum = 1;
    if (page !== undefined) {
      pageNum = Number.parseInt(page, 10);
      if (Number.isNaN(pageNum) || pageNum < 1) {
        throw new BadRequestException(
          'Invalid page. Must be a positive number.',
        );
      }
    }

    // Parse and validate perPage
    let perPageNum = 50; // Default to max allowed
    if (perPage !== undefined) {
      perPageNum = Number.parseInt(perPage, 10);
      if (Number.isNaN(perPageNum) || perPageNum < 1 || perPageNum > 50) {
        throw new BadRequestException(
          'Invalid perPage. Must be between 1 and 50.',
        );
      }
    }

    return this.anilistCrawlService.getMediaListFromAniList(
      pageNum,
      perPageNum,
    );
  }

  /**
   * Get media detail from AniList by AniList ID
   * This endpoint fetches data directly from AniList API
   * Must be placed before @Get(':id') to avoid route conflict
   *
   * @param anilistId - AniList media ID (not our internal series ID)
   * @returns AniList media data
   */
  @Get('anilist/:anilistId')
  async getAniListMediaById(@Param('anilistId') anilistId: string) {
    const id = Number.parseInt(anilistId, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException('Invalid AniList ID. Must be a number.');
    }
    return this.anilistCrawlService.getMediaById(id);
  }

  @Get('anilist/:anilistId/save')
  async saveAniListMediaById(@Param('anilistId') anilistId: string) {
    const id = Number.parseInt(anilistId, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException('Invalid AniList ID. Must be a number.');
    }
    return this.anilistCrawlService.fetchAndSaveMediaById(id);
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
