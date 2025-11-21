/**
 * Series Queue Job Interface
 *
 * Interface for series save jobs sent to RabbitMQ queue
 * Worker will fetch media data from AniList API using the aniListId
 */

export interface SeriesSaveJob {
  /**
   * Unique job identifier
   */
  jobId: string;

  /**
   * AniList media ID to fetch and save
   */
  aniListId: number;

  /**
   * Timestamp when the job was created
   */
  timestamp: string;
}

/**
 * Series Crawl Job Interface
 *
 * Interface for series crawl jobs sent to RabbitMQ queue
 * Worker will fetch pages from AniList API and queue individual media save jobs
 */
export interface SeriesCrawlJob {
  /**
   * Unique job identifier
   */
  jobId: string;

  /**
   * Media type to crawl (ANIME or MANGA)
   */
  type: 'ANIME' | 'MANGA';

  /**
   * Maximum number of pages to crawl (0 = all pages)
   */
  maxPages: number;

  /**
   * Timestamp when the job was created
   */
  timestamp: string;
}

/**
 * Series Save Job Result
 *
 * Result returned after processing series save job
 */
export interface SeriesSaveJobResult {
  /**
   * Job identifier
   */
  jobId: string;

  /**
   * Whether the job was processed successfully
   */
  success: boolean;

  /**
   * Error message if job failed
   */
  error?: string;

  /**
   * Processing time in milliseconds
   */
  processingTime: number;

  /**
   * Additional result data
   */
  data?: {
    seriesId?: string;
    aniListId?: string;
    isNew?: boolean;
  };
}
