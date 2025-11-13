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
import { AuthorsService } from './authors.service';
import {
  CreateAuthorDto,
  UpdateAuthorDto,
  QueryAuthorDto,
  LinkSeriesDto,
} from './dto';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  /**
   * Create a new author
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAuthorDto: CreateAuthorDto) {
    return this.authorsService.createWithSeries(createAuthorDto);
  }

  /**
   * Get all authors with offset pagination
   */
  @Get()
  async findAll(@Query() queryDto: QueryAuthorDto) {
    return this.authorsService.findAll(queryDto);
  }

  /**
   * Get all authors with cursor pagination
   */
  @Get('cursor')
  async findAllCursor(@Query() paginationDto: CursorPaginationDto) {
    return this.authorsService.findAllCursor(paginationDto);
  }

  /**
   * Get an author by ID with reaction counts
   */
  @Get(':id/reactions')
  async findOneWithReactions(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query('kinds') kinds?: string,
  ) {
    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.authorsService.findByIdWithReactions(id, kindsArray);
  }

  /**
   * Link series to an author with role information
   */
  @Post(':id/series')
  @Auth()
  @HttpCode(HttpStatus.OK)
  async linkSeries(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() linkSeriesDto: LinkSeriesDto,
  ) {
    await this.authorsService.linkSeriesWithRoles(id, linkSeriesDto.series);
    return { message: 'Series linked successfully' };
  }

  /**
   * Get an author by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.authorsService.findById(id, {
      relations: ['seriesRoles', 'seriesRoles.series'],
    });
  }

  /**
   * Update an author
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateAuthorDto: UpdateAuthorDto,
  ) {
    return this.authorsService.updateWithSeries(id, updateAuthorDto);
  }

  /**
   * Delete an author (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.authorsService.softDelete(id);
  }
}
