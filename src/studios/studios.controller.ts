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
import { StudiosService } from './studios.service';
import { CreateStudioDto, UpdateStudioDto, QueryStudioDto } from './dto';

@Controller('studios')
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  /**
   * Create a new studio
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStudioDto: CreateStudioDto) {
    return this.studiosService.create(createStudioDto);
  }

  /**
   * Get all studios with offset pagination
   */
  @Get()
  async findAll(@Query() queryDto: QueryStudioDto) {
    return this.studiosService.findAll(queryDto);
  }

  /**
   * Get all studios with cursor pagination
   */
  @Get('cursor')
  async findAllCursor(@Query() paginationDto: CursorPaginationDto) {
    return this.studiosService.findAllCursor(paginationDto);
  }

  /**
   * Get a studio by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.studiosService.findById(id);
  }

  /**
   * Update a studio
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateStudioDto: UpdateStudioDto,
  ) {
    return this.studiosService.update(id, updateStudioDto);
  }

  /**
   * Delete a studio (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.studiosService.softDelete(id);
  }

  /**
   * Get a studio by ID with reaction counts
   */
  @Get(':id/reactions')
  async findOneWithReactions(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query('kinds') kinds?: string,
  ) {
    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.studiosService.findByIdWithReactions(id, kindsArray);
  }
}
