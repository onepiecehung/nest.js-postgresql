import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CommentsService } from './comments.service';
import { BatchCommentsDto } from './dto/batch-comments.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a new comment
   * POST /comments
   */
  @Post()
  @Auth()
  @TrackEvent('comment_create', 'engagement', 'comment')
  @UseInterceptors(AnalyticsInterceptor)
  async createComment(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user.uid;
    return this.commentsService.createComment(userId, dto);
  }

  /**
   * Get comments with pagination and filtering
   * GET /comments
   */
  @Get()
  @Auth()
  async getComments(@Query() dto: QueryCommentsDto) {
    return this.commentsService.list(dto);
  }

  /**
   * Get comments for multiple subjects in batch
   * POST /comments/batch
   */
  @Post('batch')
  async getCommentsBatch(@Body() dto: BatchCommentsDto) {
    return this.commentsService.getBatch(dto);
  }

  /**
   * Get comment statistics for a subject
   * GET /comments/stats
   */
  @Get('stats')
  async getCommentStats(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
  ) {
    if (!subjectType || !subjectId) {
      throw new HttpException(
        'subjectType and subjectId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.commentsService.getStats(subjectType, subjectId);
  }

  /**
   * Get replies for a specific comment
   * GET /comments/:id/replies
   */
  @Get(':id/replies')
  async getCommentReplies(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Query() dto: Omit<QueryCommentsDto, 'parentId'>,
  ) {
    const queryDto: QueryCommentsDto = {
      ...dto,
      parentId: commentId,
    };

    return this.commentsService.list(queryDto);
  }

  /**
   * Pin/unpin a comment
   * POST /comments/:id/pin
   */
  @Post(':id/pin')
  @Auth()
  async togglePin(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() body: { pinned: boolean },
  ) {
    const userId = req.user.uid;
    return this.commentsService.togglePin(commentId, userId, body.pinned);
  }

  /**
   * Get a single comment by ID
   * GET /comments/:id
   */
  @Get(':id')
  async getComment(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Query('includeReplies') includeReplies?: string,
    @Query('includeAttachments') includeAttachments?: string,
    @Query('includeMentions') includeMentions?: string,
  ) {
    const options = {
      includeReplies: includeReplies === 'true',
      includeAttachments: includeAttachments !== 'false', // Default to true
      includeMentions: includeMentions !== 'false', // Default to true
    };

    return this.commentsService.getById(commentId, options);
  }

  /**
   * Update a comment
   * PUT /comments/:id
   */
  @Put(':id')
  @Auth()
  async updateComment(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: UpdateCommentDto,
  ) {
    const userId = req.user.uid;
    return this.commentsService.updateComment(commentId, userId, dto);
  }

  /**
   * Delete a comment (soft delete)
   * DELETE /comments/:id
   */
  @Delete(':id')
  @Auth()
  async deleteComment(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Request() req: Request & { user: AuthPayload },
  ) {
    const userId = req.user.uid;
    return this.commentsService.deleteComment(commentId, userId);
  }
}
