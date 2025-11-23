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
