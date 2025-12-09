import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Article } from '../entities/article.entity';
import { ARTICLE_CONSTANTS } from 'src/shared/constants';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { CacheService } from 'src/shared/services';

/**
 * Service for handling scheduled article publishing
 *
 * Features:
 * - Automatic publishing of scheduled articles
 * - Validation of scheduled dates
 * - Bulk processing of scheduled articles
 * - Error handling and logging
 * - Caching and pagination support via BaseService
 */
@Injectable()
export class ScheduledPublishingService extends BaseService<Article> {
  private readonly logger = new Logger(ScheduledPublishingService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Article>(articleRepository),
      {
        entityName: 'Article',
        cache: {
          enabled: true,
          ttlSec: 60,
          prefix: 'scheduled-articles',
          swrSec: 30,
        },
        defaultSearchField: 'title',
        relationsWhitelist: {
          user: true,
        },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof Article)[] {
    return ['title', 'summary', 'content'];
  }

  /**
   * Schedule an article for future publication
   *
   * @param articleId - ID of the article to schedule
   * @param scheduledAt - Date and time to publish the article
   * @returns Updated article with scheduled status
   */
  async scheduleArticle(
    articleId: string,
    scheduledAt: Date,
  ): Promise<Article> {
    // Validate scheduled date
    this.validateScheduledDate(scheduledAt);

    const article = await this.findById(articleId);

    // Check if article can be scheduled
    if (article.status === ARTICLE_CONSTANTS.STATUS.PUBLISHED) {
      throw new HttpException(
        { messageKey: 'article.CANNOT_SCHEDULE_PUBLISHED' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (article.status === ARTICLE_CONSTANTS.STATUS.ARCHIVED) {
      throw new HttpException(
        { messageKey: 'article.CANNOT_SCHEDULE_ARCHIVED' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update article with scheduled information
    const updateData = {
      status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
      scheduledAt: scheduledAt,
    };

    const updatedArticle = await this.update(articleId, updateData);

    this.logger.log(
      `Article ${articleId} scheduled for publication at ${scheduledAt.toISOString()}`,
    );

    return updatedArticle;
  }

  /**
   * Cancel scheduled publication for an article
   *
   * @param articleId - ID of the article to unschedule
   * @returns Updated article with draft status
   */
  async unscheduleArticle(articleId: string): Promise<Article> {
    const article = await this.findById(articleId);

    if (article.status !== ARTICLE_CONSTANTS.STATUS.SCHEDULED) {
      throw new HttpException(
        { messageKey: 'article.NOT_SCHEDULED' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Reset to draft status
    const updateData = {
      status: ARTICLE_CONSTANTS.STATUS.DRAFT,
      scheduledAt: undefined,
    };

    const updatedArticle = await this.update(articleId, updateData);

    this.logger.log(`Article ${articleId} unscheduled from publication`);

    return updatedArticle;
  }

  /**
   * Update scheduled publication time for an article
   *
   * @param articleId - ID of the article to reschedule
   * @param newScheduledAt - New date and time to publish the article
   * @returns Updated article with new scheduled time
   */
  async rescheduleArticle(
    articleId: string,
    newScheduledAt: Date,
  ): Promise<Article> {
    // Validate new scheduled date
    this.validateScheduledDate(newScheduledAt);

    const article = await this.findById(articleId);

    if (article.status !== ARTICLE_CONSTANTS.STATUS.SCHEDULED) {
      throw new HttpException(
        { messageKey: 'article.NOT_SCHEDULED' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update scheduled time
    const updateData = {
      scheduledAt: newScheduledAt,
    };

    const updatedArticle = await this.update(articleId, updateData);

    this.logger.log(
      `Article ${articleId} rescheduled for publication at ${newScheduledAt.toISOString()}`,
    );

    return updatedArticle;
  }

  /**
   * Publish a scheduled article immediately
   *
   * @param articleId - ID of the article to publish immediately
   * @returns Updated article with published status
   */
  async publishScheduledArticle(articleId: string): Promise<Article> {
    const article = await this.findById(articleId);

    if (article.status !== ARTICLE_CONSTANTS.STATUS.SCHEDULED) {
      throw new HttpException(
        { messageKey: 'article.NOT_SCHEDULED' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Publish the article
    const updateData = {
      status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
      publishedAt: new Date(),
      scheduledAt: undefined, // Clear scheduled time
    };

    const updatedArticle = await this.update(articleId, updateData);

    this.logger.log(`Scheduled article ${articleId} published immediately`);

    return updatedArticle;
  }

  /**
   * Get all scheduled articles
   *
   * @param limit - Maximum number of articles to return
   * @param offset - Number of articles to skip
   * @returns Array of scheduled articles
   */
  async getScheduledArticles(
    limit: number = 50,
    offset: number = 0,
  ): Promise<Article[]> {
    return await this.articleRepository.find({
      where: { status: ARTICLE_CONSTANTS.STATUS.SCHEDULED },
      order: { scheduledAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get articles scheduled for a specific date range
   *
   * @param startDate - Start date of the range
   * @param endDate - End date of the range
   * @returns Array of scheduled articles in the date range
   */
  async getScheduledArticlesInRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Article[]> {
    return await this.articleRepository
      .createQueryBuilder('article')
      .where('article.status = :status', {
        status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
      })
      .andWhere('article.scheduledAt >= :startDate', { startDate })
      .andWhere('article.scheduledAt <= :endDate', { endDate })
      .orderBy('article.scheduledAt', 'ASC')
      .getMany();
  }

  /**
   * Get articles that are ready to be published
   * (scheduled time has passed)
   *
   * @returns Array of articles ready for publication
   */
  async getReadyToPublishArticles(): Promise<Article[]> {
    const now = new Date();

    return await this.articleRepository.find({
      where: {
        status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
      },
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Cron job to automatically publish scheduled articles
   * Runs every minute to check for articles ready to publish
   */
  // @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledArticles(): Promise<void> {
    try {
      this.logger.log('Publishing scheduled articles');
      const readyArticles = await this.getReadyToPublishArticles();

      if (readyArticles.length === 0) {
        this.logger.log('No articles ready for publication');
        return;
      }

      this.logger.log(
        `Found ${readyArticles.length} articles ready for publication`,
      );

      // Process each article
      for (const article of readyArticles) {
        try {
          await this.publishArticle(article);
          this.logger.log(`Successfully published article ${article.id}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to publish article ${article.id}: ${error?.message || 'Unknown error'}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error in scheduled publishing cron job: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Publish a single article
   *
   * @param article - Article to publish
   * @returns Updated article
   */
  private async publishArticle(article: Article): Promise<Article> {
    const updateData = {
      status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
      publishedAt: new Date(),
      scheduledAt: undefined, // Clear scheduled time
    };

    return await this.update(article.id, updateData);
  }

  /**
   * Validate that a scheduled date is in the future
   *
   * @param scheduledAt - Date to validate
   * @throws Error if date is in the past
   */
  private validateScheduledDate(scheduledAt: Date): void {
    const now = new Date();

    if (scheduledAt <= now) {
      throw new HttpException(
        { messageKey: 'article.INVALID_SCHEDULED_DATE' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Optional: Add maximum scheduling limit (e.g., 1 year from now)
    const maxScheduledDate = new Date();
    maxScheduledDate.setFullYear(maxScheduledDate.getFullYear() + 1);

    if (scheduledAt > maxScheduledDate) {
      throw new HttpException(
        { messageKey: 'article.SCHEDULED_DATE_TOO_FAR' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get statistics about scheduled articles
   *
   * @returns Object with scheduling statistics
   */
  async getSchedulingStats(): Promise<{
    totalScheduled: number;
    readyToPublish: number;
    nextScheduled: Date | null;
  }> {
    const [totalScheduled, readyToPublish, nextScheduled] = await Promise.all([
      this.articleRepository.count({
        where: { status: ARTICLE_CONSTANTS.STATUS.SCHEDULED },
      }),
      this.getReadyToPublishArticles().then((articles) => articles.length),
      this.articleRepository
        .createQueryBuilder('article')
        .select('MIN(article.scheduledAt)', 'nextScheduled')
        .where('article.status = :status', {
          status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
        })
        .getRawOne()
        .then((result: any) => {
          if (result?.nextScheduled) {
            return new Date(result.nextScheduled as string);
          }
          return null;
        }),
    ]);

    return {
      totalScheduled,
      readyToPublish,
      nextScheduled,
    };
  }
}
