import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsService } from 'src/analytics/analytics.service';
import {
  AnalyticsQueueJob,
  AnalyticsQueueJobResult,
} from 'src/analytics/interfaces/analytics-queue.interface';
import { CommentsService } from 'src/comments/comments.service';
import { maskEmail } from 'src/common/utils';
import {
  SeriesBatchSaveJob,
  SeriesCrawlJob,
  SeriesSaveJob,
  SeriesSaveJobResult,
} from 'src/series/services/series-queue.interface';
import { AniListCrawlService } from 'src/series/services/anilist-crawl.service';
import {
  ShareCountResult,
  ShareCountUpdateJob,
  ShareCreatedJob,
  ShareDeletedJob,
} from 'src/share/interfaces/share-queue.interface';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';
import { MailQueueIntegrationService } from 'src/shared/services/mail/mail-queue-integration.service';
import {
  BatchEmailQueueJob,
  MailQueueJobResult,
  OtpEmailQueueJob,
  SingleEmailQueueJob,
  TemplateEmailQueueJob,
} from 'src/shared/services/mail/mail-queue.interface';
import { MailService } from 'src/shared/services/mail/mail.service';

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly commentsService: CommentsService,
    private readonly mailQueueIntegrationService: MailQueueIntegrationService,
    private readonly analyticsService: AnalyticsService,
    private readonly aniListCrawlService: AniListCrawlService,
  ) {}

  testRABBIT(id: number) {
    return `This action removes a #${id} worker`;
  }

  /**
   * Process single email job
   */
  async processSingleEmail(
    job: SingleEmailQueueJob,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(`Processing single email job: ${job.jobId}`);

    try {
      const result = await this.mailService.sendMail(job.mailOptions);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Single email job completed: ${job.jobId}, success: ${result.success}`,
      );

      return {
        jobId: job.jobId,
        success: result.success,
        error: result.error,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Single email job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process batch email job
   */
  async processBatchEmail(
    job: BatchEmailQueueJob,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing batch email job: ${job.jobId}, recipients: ${job.recipients.length}`,
    );

    try {
      const result = await this.mailService.sendMailBatch(
        job.mailOptions,
        job.recipients,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Batch email job completed: ${job.jobId}, success: ${result.success}, sent: ${result.totalSent}, failed: ${result.totalFailed}`,
      );

      return {
        jobId: job.jobId,
        success: result.success,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Batch email job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process template email job
   */
  async processTemplateEmail(
    job: TemplateEmailQueueJob,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing template email job: ${job.jobId}, template: ${job.templateName}`,
    );

    try {
      const result = await this.mailService.sendTemplateMail(
        job.templateName,
        job.recipients,
        job.templateData,
        job.options,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Template email job completed: ${job.jobId}, success: ${result.success}`,
      );

      return {
        jobId: job.jobId,
        success: result.success,
        error: result.error,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Template email job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process OTP email job
   */
  async processOtpEmail(
    job: OtpEmailQueueJob | string,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    const jobData =
      typeof job === 'string' ? (JSON.parse(job) as OtpEmailQueueJob) : job;
    console.log('jobData', jobData);
    this.logger.log(
      `Processing OTP email job: ${jobData.jobId}, email: ${maskEmail(jobData.email)}`,
    );

    try {
      const result = await this.mailService.sendTemplateMail(
        'otp-login',
        { email: jobData.email },
        {
          otpCode: jobData.otpCode,
          requestId: jobData.requestId,
          appName: process.env.APP_NAME || 'NestJS App',
          appUrl: process.env.APP_URL || 'http://localhost:3000',
          supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
          companyName: process.env.COMPANY_NAME || 'Your Company',
          ...jobData.templateData,
        },
        {
          priority: 'high',
          headers: {
            'X-OTP-Request-ID': jobData.requestId,
            'X-OTP-Type': 'login',
          },
        },
      );
      console.log(result);
      const processingTime = Date.now() - startTime;
      this.logger.log(
        `OTP email job completed: ${jobData.jobId}, success: ${result.success}`,
      );

      return {
        jobId: jobData.jobId,
        success: result.success,
        error: result.error,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`OTP email job failed: ${jobData.jobId}`, error);

      return {
        jobId: jobData.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process comment created event
   * Handles notifications, analytics, and other post-creation tasks
   */
  async processCommentCreated(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment created event: ${data}`);

    try {
      // Update reply count for parent comment if this is a reply
      if (data.parentId) {
        await this.commentsService.updateReplyCount(data.parentId, true);
        this.logger.log(
          `Updated reply count for parent comment: ${data.parentId}`,
        );
      }

      // TODO: Add other comment created processing logic here
      // Examples:
      // - Send notifications to mentioned users
      // - Update comment statistics
      // - Trigger moderation checks
      // - Send WebSocket notifications
      // - Update search indexes
      // - Log analytics events

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment created event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment created event: ${data}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process comment updated event
   * Handles notifications, analytics, and other post-update tasks
   */
  async processCommentUpdated(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment updated event: ${data}`);

    try {
      // TODO: Add comment updated processing logic here
      // Examples:
      // - Send notifications to subscribers
      // - Update comment statistics
      // - Trigger moderation checks for edited content
      // - Send WebSocket notifications
      // - Update search indexes
      // - Log analytics events

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment updated event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment updated event: ${data}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process comment deleted event
   * Handles cleanup, notifications, and other post-deletion tasks
   */
  async processCommentDeleted(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment deleted event: ${data}`);

    try {
      // Update reply count for parent comment if this was a reply
      if (data.parentId) {
        await this.commentsService.updateReplyCount(data.parentId, false);
        this.logger.log(
          `Decremented reply count for parent comment: ${data.parentId}`,
        );
      }

      // TODO: Add other comment deleted processing logic here
      // Examples:
      // - Clean up related data (reactions, attachments, etc.)
      // - Send notifications to subscribers
      // - Update comment statistics
      // - Send WebSocket notifications
      // - Update search indexes
      // - Log analytics events
      // - Handle soft delete vs hard delete logic

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment deleted event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment deleted event: ${data}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process comment pinned event
   * Handles notifications and other post-pin tasks
   */
  async processCommentPinned(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment pinned event: ${data}`);

    try {
      // TODO: Add comment pinned processing logic here
      // Examples:
      // - Send notifications to relevant users
      // - Update comment statistics
      // - Send WebSocket notifications
      // - Log analytics events
      // - Update pinned comment lists

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment pinned event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment pinned event: ${data}`,
        error,
      );
      throw error;
    }
  }

  // ==================== NOTIFICATION PROCESSING METHODS ====================

  /**
   * Process notification email job
   * Handles sending email notifications via queue
   */
  async processNotificationEmail(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing notification email: ${data?.notificationId}`);

    try {
      // Extract notification data
      const {
        notificationId,
        userId,
        type,
        title,
        message,
        actionUrl,
        emailTemplate,
        emailTemplateData,
        metadata,
      } = data;

      // Get user email from metadata or user service
      const userEmail = metadata?.userEmail || `user-${userId}@example.com`;
      const userName = metadata?.userName || 'User';

      // Prepare email template data
      const templateData = {
        appName: process.env.APP_NAME || 'NestJS App',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
        supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
        companyName: process.env.COMPANY_NAME || 'Your Company',
        companyAddress: process.env.COMPANY_ADDRESS || 'Your Address',
        name: userName,
        email: userEmail,
        title,
        message,
        actionUrl,
        ...emailTemplateData,
      };

      // Send email using template
      const result =
        await this.mailQueueIntegrationService.sendTemplateMailQueue(
          emailTemplate || this.getDefaultEmailTemplate(type),
          { email: userEmail, name: userName },
          templateData,
          {
            subject: title,
            priority: 'normal',
          },
          5, // priority
        );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Notification email processed: ${notificationId}, jobId: ${result.jobId}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing notification email: ${data.notificationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process notification push job
   * Handles sending push notifications
   */
  async processNotificationPush(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing notification push: ${data?.notificationId}`);

    try {
      // Extract notification data
      const {
        notificationId,
        userId,
        type,
        title,
        message,
        actionUrl,
        pushData,
        metadata,
      } = data;

      // TODO: Implement push notification service
      // This would integrate with services like Firebase Cloud Messaging, OneSignal, etc.
      this.logger.log(
        `Push notification would be sent to user ${userId}: ${title}`,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Notification push processed: ${notificationId}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing notification push: ${data.notificationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process notification in-app job
   * Handles storing in-app notifications
   */
  async processNotificationInApp(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing notification in-app: ${data?.notificationId}`);

    try {
      // Extract notification data
      const {
        notificationId,
        userId,
        type,
        title,
        message,
        actionUrl,
        metadata,
      } = data;

      // TODO: Implement in-app notification storage
      // This would store the notification in the database for in-app display
      this.logger.log(
        `In-app notification stored for user ${userId}: ${title}`,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Notification in-app processed: ${notificationId}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing notification in-app: ${data.notificationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process notification batch email job
   * Handles sending multiple email notifications in batch
   */
  async processNotificationBatchEmail(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing notification batch email: ${data?.batchId}`);

    try {
      const { notifications, templateName, templateData } = data;

      // Process notifications in batches
      const batchSize = NOTIFICATION_CONSTANTS.BATCH_SIZE;
      const batches = this.chunkArray(notifications, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (notification: any) => {
          try {
            return await this.processNotificationEmail(notification);
          } catch (error) {
            this.logger.error(
              `Failed to process notification in batch: ${notification.notificationId}`,
              error,
            );
            return null;
          }
        });

        await Promise.allSettled(batchPromises);

        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(1000);
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Notification batch email processed: ${data?.batchId}, notifications: ${notifications?.length}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing notification batch email: ${data?.batchId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get default email template for notification type
   */
  private getDefaultEmailTemplate(type: string): string {
    const templateMap: Record<string, string> = {
      [NOTIFICATION_CONSTANTS.TYPES.ARTICLE_COMMENTED]:
        NOTIFICATION_CONSTANTS.EMAIL_TEMPLATES.COMMENT_NOTIFICATION,
      [NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED]:
        NOTIFICATION_CONSTANTS.EMAIL_TEMPLATES.LIKE_NOTIFICATION,
      [NOTIFICATION_CONSTANTS.TYPES.COMMENT_MENTIONED]:
        NOTIFICATION_CONSTANTS.EMAIL_TEMPLATES.MENTION_NOTIFICATION,
      [NOTIFICATION_CONSTANTS.TYPES.ARTICLE_PUBLISHED]:
        NOTIFICATION_CONSTANTS.EMAIL_TEMPLATES.ARTICLE_PUBLISHED,
      [NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT]:
        NOTIFICATION_CONSTANTS.EMAIL_TEMPLATES.SYSTEM_ANNOUNCEMENT,
    };

    return templateMap[type] || 'notification';
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== SHARE PROCESSING METHODS ====================

  /**
   * Process share created event
   * Updates share count for the content and triggers related analytics
   */
  async processShareCreated(job: ShareCreatedJob): Promise<ShareCountResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing share created: ${job.shareId} for ${job.contentType}:${job.contentId}`,
    );

    try {
      // TODO: Implement share count update logic
      // This would typically involve:
      // 1. Updating a share_count field in the content table
      // 2. Updating analytics/statistics
      // 3. Triggering notifications if needed
      // 4. Updating search indexes

      this.logger.log(
        `Share created processed: ${job.shareId}, content: ${job.contentType}:${job.contentId}`,
      );

      const processingTime = Date.now() - startTime;
      return {
        jobId: job.jobId,
        success: true,
        processingTime,
        data: {
          contentType: job.contentType,
          contentId: job.contentId,
          shareCount: 1, // This would be the actual count from database
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Error processing share created: ${job.shareId}`,
        error,
      );

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process share deleted event
   * Decrements share count for the content and triggers related cleanup
   */
  async processShareDeleted(job: ShareDeletedJob): Promise<ShareCountResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing share deleted: ${job.shareId} for ${job.contentType}:${job.contentId}`,
    );

    try {
      // TODO: Implement share count decrement logic
      // This would typically involve:
      // 1. Decrementing share_count field in the content table
      // 2. Updating analytics/statistics
      // 3. Cleaning up related data if needed
      // 4. Updating search indexes

      this.logger.log(
        `Share deleted processed: ${job.shareId}, content: ${job.contentType}:${job.contentId}`,
      );

      const processingTime = Date.now() - startTime;
      return {
        jobId: job.jobId,
        success: true,
        processingTime,
        data: {
          contentType: job.contentType,
          contentId: job.contentId,
          shareCount: 0, // This would be the actual count from database
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Error processing share deleted: ${job.shareId}`,
        error,
      );

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process share count update event
   * Handles bulk updates or corrections to share counts
   */
  async processShareCountUpdate(
    job: ShareCountUpdateJob,
  ): Promise<ShareCountResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing share count update: ${job.operation} for ${job.contentType}:${job.contentId}`,
    );

    try {
      // TODO: Implement share count update logic
      // This would typically involve:
      // 1. Incrementing or decrementing share_count field in the content table
      // 2. Updating analytics/statistics
      // 3. Triggering related updates if needed
      // 4. Updating search indexes

      this.logger.log(
        `Share count update processed: ${job.operation} for ${job.contentType}:${job.contentId}`,
      );

      const processingTime = Date.now() - startTime;
      return {
        jobId: job.jobId,
        success: true,
        processingTime,
        data: {
          contentType: job.contentType,
          contentId: job.contentId,
          shareCount: job.operation === 'increment' ? 1 : -1, // This would be the actual count from database
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Error processing share count update: ${job.contentType}:${job.contentId}`,
        error,
      );

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  // ==================== ANALYTICS PROCESSING METHODS ====================

  /**
   * Process analytics track job
   * Handles analytics event tracking and metrics updates
   */
  async processAnalyticsTrack(
    job: AnalyticsQueueJob,
  ): Promise<AnalyticsQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(`Processing analytics track job: ${job.jobId}`);
    try {
      // Create TrackEventDto from job data
      const trackEventDto = {
        eventType: job.eventType,
        eventCategory: job.eventCategory,
        subjectType: job.subjectType,
        subjectId: job.subjectId,
        eventData: job.eventData,
      };

      // Track the event synchronously (this will also update metrics)
      const savedEvent = await this.analyticsService.trackEvent(
        trackEventDto,
        job.userId,
        job.sessionId,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Analytics track job completed: ${job.jobId}, eventId: ${savedEvent.id}, time: ${processingTime}ms`,
      );

      return {
        jobId: job.jobId,
        success: true,
        processingTime,
        data: {
          eventId: savedEvent.id,
          metricsUpdated: true,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Analytics track job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  // ==================== SERIES PROCESSING METHODS ====================

  /**
   * Process series save job
   * Fetches media data from AniList API and saves it to database as Series entity
   */
  async processSeriesSave(job: SeriesSaveJob): Promise<SeriesSaveJobResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing series save job: ${job.jobId} (AniList ID: ${job.aniListId})`,
    );

    try {
      // Fetch media data from AniList API
      const anilistMedia = await this.aniListCrawlService.getMediaById(
        job.aniListId,
      );

      if (!anilistMedia) {
        throw new Error(`Media with AniList ID ${job.aniListId} not found`);
      }

      // Process and save series from AniList media data
      const savedSeries =
        await this.aniListCrawlService.processAndSaveSeriesFromAniListMedia(
          anilistMedia,
        );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Series save job completed: ${job.jobId}, seriesId: ${savedSeries.id}, time: ${processingTime}ms`,
      );

      // Check if this was a new series or an update
      const isNew =
        savedSeries.createdAt.getTime() === savedSeries.updatedAt.getTime();

      return {
        jobId: job.jobId,
        success: true,
        processingTime,
        data: {
          seriesId: savedSeries.id,
          aniListId: savedSeries.aniListId,
          isNew,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Series save job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process series crawl job
   * Fetches all pages from AniList API and saves media directly to database
   */
  async processSeriesCrawl(job: SeriesCrawlJob): Promise<void> {
    const startTime = Date.now();
    this.logger.log(
      `Processing series crawl job: ${job.jobId} (Type: ${job.type}, All pages)`,
    );

    try {
      // Process crawl job - this will fetch all pages and save media directly to database
      const result = await this.aniListCrawlService.processCrawlJob(job.type);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Series crawl job completed: ${job.jobId}, Fetched: ${result.totalFetched}, Queued: ${result.totalQueued}, Errors: ${result.errors}, time: ${processingTime}ms`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Series crawl job failed: ${job.jobId}`, error);
      throw error;
    }
  }

  /**
   * Process series batch save job
   * Queues individual media save jobs with rate limiting (30 requests per minute)
   *
   * @param job - Batch save job containing array of AniList media IDs
   */
  async processSeriesBatchSave(job: SeriesBatchSaveJob): Promise<void> {
    const startTime = Date.now();
    const totalItems = job.aniListIds.length;
    this.logger.log(
      `Processing series batch save job: ${job.jobId} (${totalItems} items)`,
    );

    const RATE_LIMIT_PER_MINUTE = 30; // AniList rate limit: 30 requests per minute
    const DELAY_BETWEEN_REQUESTS = (60 * 1000) / RATE_LIMIT_PER_MINUTE; // ~2000ms between requests

    let queued = 0;
    let errors = 0;

    try {
      // Queue each media ID with rate limiting
      for (let i = 0; i < job.aniListIds.length; i++) {
        const aniListId = job.aniListIds[i];

        try {
          // Queue individual media save job
          await this.aniListCrawlService.fetchAndSaveMediaById(aniListId);
          queued++;

          // Log progress every 100 items
          if ((i + 1) % 100 === 0) {
            this.logger.log(
              `Batch save progress: ${i + 1}/${totalItems} items queued`,
            );
          }

          // Rate limiting: wait between requests (except for the last one)
          if (i < job.aniListIds.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, DELAY_BETWEEN_REQUESTS),
            );
          }
        } catch (error: unknown) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to queue media ${aniListId} in batch: ${errorMessage}`,
          );
          // Continue with next item even if one fails
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Series batch save job completed: ${job.jobId}, Queued: ${queued}/${totalItems}, Errors: ${errors}, time: ${processingTime}ms`,
      );
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Series batch save job failed: ${job.jobId}, Error: ${errorMessage}, time: ${processingTime}ms`,
      );
      throw error;
    }
  }
}
