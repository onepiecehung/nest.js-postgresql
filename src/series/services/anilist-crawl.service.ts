import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { generateJobId } from 'src/common/utils';
import { JOB_NAME, SERIES_CONSTANTS } from 'src/shared/constants';
import { CacheService, RabbitMQService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { Series } from '../entities/series.entity';
import {
  AniListExternalLink,
  AniListFuzzyDate,
  AniListGraphQLResponse,
  AniListMedia,
  AniListMediaListCollection,
  AniListMediaListEntry,
  AniListMediaListResponse,
  AniListMediaResponse,
  AniListOAuthConfig,
  AniListPage,
  AniListPageInfo,
  AniListStreamingEpisode,
  AniListTokenResponse,
} from './anilist.types';
import { SeriesCrawlJob, SeriesSaveJob } from './series-queue.interface';

/**
 * Service for crawling media data from AniList API
 *
 * Features:
 * - Fetches media data from AniList GraphQL API
 * - Maps AniList Media to Series entity
 * - Updates or creates series in database
 * - Handles pagination for large datasets
 * - Scheduled cronjob for periodic updates
 */
@Injectable()
export class AniListCrawlService {
  private readonly logger = new Logger(AniListCrawlService.name);
  private readonly ANILIST_API_URL = 'https://graphql.anilist.co';
  private readonly PER_PAGE = 50; // AniList allows up to 50 items per page
  private readonly ACCESS_TOKEN_CACHE_KEY = 'anilist:access_token';
  private readonly REFRESH_TOKEN_CACHE_KEY = 'anilist:refresh_token';
  private oauthConfig: AniListOAuthConfig | null = null;

  // Rate limiting tracking
  private rateLimitLimit: number = 90; // Default: 90 requests per minute (currently degraded to 30)
  private rateLimitRemaining: number = 90;
  private rateLimitReset: number = 0; // Unix timestamp
  private lastRequestTime: number = 0;

  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService?: CacheService,
    private readonly rabbitMQService?: RabbitMQService,
  ) {
    // Initialize OAuth config if credentials are available
    const oauth = this.configService.get<AniListOAuthConfig>('oauth.anilist');
    if (oauth?.clientId && oauth?.clientSecret) {
      this.oauthConfig = oauth;
      this.logger.log('AniList OAuth configuration loaded');
    } else {
      this.logger.warn(
        'AniList OAuth credentials not configured. Crawling will proceed without authentication.',
      );
    }
  }

  /**
   * GraphQL fragment for Media fields
   * Reusable fragment to avoid duplication between getMediaQuery and getMediaByIdQuery
   */
  private getMediaFieldsFragment(): string {
    return `
      fragment mediaFields on Media {
        id
        idMal
        title {
          romaji
          english
          native
          userPreferred
        }
        type
        format
        status
        description
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        season
        seasonYear
        episodes
        duration
        chapters
        volumes
        countryOfOrigin
        isLicensed
        source
        coverImage {
          large
          medium
          color
          extraLarge
        }
        bannerImage
        synonyms
        averageScore
        meanScore
        popularity
        isLocked
        trending
        isAdult
        genres
        tags {
          id
          name
          description
          category
          rank
          isGeneralSpoiler
          isMediaSpoiler
          isAdult
        }
        externalLinks {
          id
          site
          url
          type
          language
          color
          icon
          notes
          isDisabled
        }
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
        siteUrl
        autoCreateForumThread
        isRecommendationBlocked
        isReviewBlocked
        modNotes
        updatedAt
        favourites
        trailer {
          id
          site
          thumbnail
        }
        nextAiringEpisode {
          id
          airingAt
          timeUntilAiring
          episode
          mediaId
        }
        studios {
          edges {
            id
            isMain
            node {
              id
              name
              isAnimationStudio
              siteUrl
              favourites
            }
          }
        }
        staff {
          edges {
            id
            role
            node {
              id
              name {
                first
                middle
                last
                full
                native
                alternative
                userPreferred
              }
              language
              image {
                large
                medium
              }
              description
              primaryOccupations
              gender
              dateOfBirth {
                year
                month
                day
              }
              dateOfDeath {
                year
                month
                day
              }
              age
              yearsActive
              homeTown
              siteUrl
              favourites
            }
          }
        }
        characters {
          edges {
            id
            role
            name
            voiceActors {
              id
              name {
                first
                middle
                last
                full
                native
                alternative
                userPreferred
              }
              language
              image {
                large
                medium
              }
            }
            node {
              id
              name {
                first
                middle
                last
                full
                native
                alternative
                userPreferred
              }
              image {
                large
                medium
              }
              description
              gender
              dateOfBirth {
                year
                month
                day
              }
              age
              bloodType
              siteUrl
              favourites
              modNotes
            }
          }
        }
        relations {
          edges {
            id
            relationType
            node {
              id
              type
              title {
                romaji
                english
                native
                userPreferred
              }
              format
              status
              coverImage {
                large
                medium
              }
            }
          }
        }
        recommendations {
          edges {
            node {
              id
              rating
              userRating
              mediaRecommendation {
                id
                type
                title {
                  romaji
                  english
                  native
                  userPreferred
                }
                format
                status
                coverImage {
                  large
                  medium
                }
              }
              user {
                id
                name
              }
            }
          }
        }
        stats {
          scoreDistribution {
            score
            amount
          }
          statusDistribution {
            status
            amount
          }
        }
        rankings {
          id
          rank
          type
          format
          year
          season
          allTime
          context
        }
        mediaListEntry {
          id
          status
          score
          progress
          progressVolumes
          repeat
          priority
          private
          notes
          hiddenFromStatusLists
          customLists
          advancedScores
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
          updatedAt
          createdAt
        }
        reviews {
          nodes {
            id
            summary
            body
            rating
            ratingAmount
            user {
              id
              name
            }
            createdAt
            updatedAt
          }
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
        }
        hashtag
        isFavourite
        isFavouriteBlocked
      }
    `;
  }

  /**
   * GraphQL query to fetch media data from AniList
   * Uses fragment to avoid code duplication
   */
  private getMediaQuery(): string {
    return `
      ${this.getMediaFieldsFragment()}
      query ($page: Int, $perPage: Int, $type: MediaType) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(type: $type, sort: ID_DESC) {
            ...mediaFields
          }
        }
      }
    `;
  }

  /**
   * Get access token from cache or OAuth
   *
   * @returns Access token string or null if not available
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.oauthConfig) {
      return null;
    }

    // Try to get from cache first
    if (this.cacheService) {
      const cachedToken = await this.cacheService.get<string>(
        this.ACCESS_TOKEN_CACHE_KEY,
      );
      if (cachedToken) {
        return cachedToken;
      }
    }

    // If no cached token, return null (user needs to authenticate first)
    return null;
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code - Authorization code from OAuth callback
   * @returns Promise with token response
   */
  async exchangeAuthorizationCode(code: string): Promise<AniListTokenResponse> {
    if (!this.oauthConfig) {
      throw new Error('AniList OAuth is not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<AniListTokenResponse>(
          this.oauthConfig.tokenUrl,
          {
            grant_type: 'authorization_code',
            client_id: this.oauthConfig.clientId,
            client_secret: this.oauthConfig.clientSecret,
            redirect_uri: this.oauthConfig.redirectUri,
            code,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );

      const tokenData = response.data;

      // Cache the access token (expires_in is in seconds)
      if (this.cacheService && tokenData.access_token) {
        const ttl = tokenData.expires_in || 3600; // Default to 1 hour
        await this.cacheService.set(
          this.ACCESS_TOKEN_CACHE_KEY,
          tokenData.access_token,
          ttl - 60, // Cache for slightly less time to avoid expiration issues
        );

        // Cache refresh token if available
        if (tokenData.refresh_token) {
          await this.cacheService.set(
            this.REFRESH_TOKEN_CACHE_KEY,
            tokenData.refresh_token,
            30 * 24 * 60 * 60, // 30 days
          );
        }
      }

      this.logger.log(
        'Successfully exchanged authorization code for access token',
      );
      return tokenData;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to exchange authorization code: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @returns Promise with new token response
   */
  async refreshAccessToken(): Promise<AniListTokenResponse | null> {
    if (!this.oauthConfig || !this.cacheService) {
      return null;
    }

    const refreshToken = await this.cacheService.get<string>(
      this.REFRESH_TOKEN_CACHE_KEY,
    );

    if (!refreshToken) {
      this.logger.warn('No refresh token available');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<AniListTokenResponse>(
          this.oauthConfig.tokenUrl,
          {
            grant_type: 'refresh_token',
            client_id: this.oauthConfig.clientId,
            client_secret: this.oauthConfig.clientSecret,
            refresh_token: refreshToken,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );

      const tokenData = response.data;

      // Cache the new access token
      if (tokenData.access_token) {
        const ttl = tokenData.expires_in || 3600;
        await this.cacheService.set(
          this.ACCESS_TOKEN_CACHE_KEY,
          tokenData.access_token,
          ttl - 60,
        );

        // Update refresh token if a new one is provided
        if (tokenData.refresh_token) {
          await this.cacheService.set(
            this.REFRESH_TOKEN_CACHE_KEY,
            tokenData.refresh_token,
            30 * 24 * 60 * 60,
          );
        }
      }

      this.logger.log('Successfully refreshed access token');
      return tokenData;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh access token: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get authorization headers for API requests
   *
   * @returns Headers object with authorization if available
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const accessToken = await this.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  /**
   * Fetch media data from AniList API
   *
   * @param page - Page number to fetch
   * @param perPage - Number of items per page
   * @param type - Media type (ANIME or MANGA)
   * @returns Promise with AniList page data
   */
  /**
   * Handle rate limiting based on API response headers
   * Waits if necessary to respect rate limits
   */
  private async handleRateLimit(headers: Record<string, any>): Promise<void> {
    // Update rate limit info from headers
    if (headers['x-ratelimit-limit']) {
      this.rateLimitLimit = parseInt(
        headers['x-ratelimit-limit'] as string,
        10,
      );
    }
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitRemaining = parseInt(
        headers['x-ratelimit-remaining'] as string,
        10,
      );
    }
    if (headers['x-ratelimit-reset']) {
      this.rateLimitReset = parseInt(
        headers['x-ratelimit-reset'] as string,
        10,
      );
    }

    // Calculate delay based on remaining requests
    // If remaining is low, add delay to avoid hitting limit
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Calculate minimum delay between requests to stay within rate limit
    // Rate limit is per minute, so delay = 60000ms / rateLimitLimit
    const minDelayBetweenRequests = Math.ceil(60000 / this.rateLimitLimit);

    // If we have few requests remaining, increase delay
    const remainingPercentage = this.rateLimitRemaining / this.rateLimitLimit;
    let delay = minDelayBetweenRequests;

    if (remainingPercentage < 0.2) {
      // Less than 20% remaining, wait longer
      delay = minDelayBetweenRequests * 3;
    } else if (remainingPercentage < 0.5) {
      // Less than 50% remaining, wait a bit longer
      delay = minDelayBetweenRequests * 2;
    }

    // Wait if needed
    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      this.logger.debug(
        `Rate limit: ${this.rateLimitRemaining}/${this.rateLimitLimit} remaining. Waiting ${waitTime}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Handle 429 rate limit error with retry logic
   */
  private async handleRateLimitError(
    retryAfter?: number,
    rateLimitReset?: number,
  ): Promise<void> {
    let waitTime = 60000; // Default: wait 1 minute

    if (retryAfter) {
      waitTime = retryAfter * 1000; // Convert seconds to milliseconds
    } else if (rateLimitReset) {
      const now = Math.floor(Date.now() / 1000);
      waitTime = (rateLimitReset - now) * 1000;
      if (waitTime < 0) waitTime = 60000; // Fallback to 1 minute
    }

    this.logger.warn(
      `Rate limit exceeded. Waiting ${waitTime / 1000} seconds before retry...`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  private async fetchMediaFromAniList(
    page: number = 1,
    perPage: number = this.PER_PAGE,
    type: 'ANIME' | 'MANGA' = 'ANIME',
    retryCount: number = 0,
  ): Promise<AniListPage> {
    const query = this.getMediaQuery();
    const variables = {
      page,
      perPage,
      type,
    };

    try {
      // Get authorization headers (with access token if available)
      const headers = await this.getAuthHeaders();

      // HttpService from @nestjs/axios uses post(url, data, config)
      const response = await firstValueFrom(
        this.httpService.post<AniListGraphQLResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables,
          },
          {
            headers,
          },
        ),
      );

      // Handle rate limiting from response headers
      if (response.headers) {
        await this.handleRateLimit(response.headers);
      }

      // HttpService returns { data: {...}, status: 200, ... }
      const responseData = response.data;

      // Handle GraphQL response structure
      if (responseData.errors && responseData.errors.length > 0) {
        // Check for rate limit error (429)
        const rateLimitError = responseData.errors.find(
          (e: { status?: number; message?: string }) => e.status === 429,
        );
        if (rateLimitError && retryCount < 3) {
          // Get retry-after from response headers if available
          const retryAfter = response.headers?.['retry-after']
            ? parseInt(String(response.headers['retry-after']), 10)
            : undefined;
          const rateLimitReset = response.headers?.['x-ratelimit-reset']
            ? parseInt(String(response.headers['x-ratelimit-reset']), 10)
            : undefined;

          await this.handleRateLimitError(retryAfter, rateLimitReset);
          // Retry the request
          return this.fetchMediaFromAniList(
            page,
            perPage,
            type,
            retryCount + 1,
          );
        }

        const errorMessages = responseData.errors
          .map((e: { message?: string }) => e.message || 'Unknown error')
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      if (!responseData.data || !responseData.data.Page) {
        throw new Error('No data returned from AniList API');
      }

      return responseData.data;
    } catch (error: unknown) {
      // Handle HTTP 429 errors
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 429 &&
        retryCount < 3
      ) {
        const response = error.response as {
          status: number;
          headers?: Record<string, string | string[] | undefined>;
        };
        const retryAfterHeader = response.headers?.['retry-after'];
        const retryAfter = retryAfterHeader
          ? parseInt(
              Array.isArray(retryAfterHeader)
                ? retryAfterHeader[0]
                : retryAfterHeader,
              10,
            )
          : undefined;
        const rateLimitResetHeader = response.headers?.['x-ratelimit-reset'];
        const rateLimitReset = rateLimitResetHeader
          ? parseInt(
              Array.isArray(rateLimitResetHeader)
                ? rateLimitResetHeader[0]
                : rateLimitResetHeader,
              10,
            )
          : undefined;

        await this.handleRateLimitError(retryAfter, rateLimitReset);
        // Retry the request
        return this.fetchMediaFromAniList(page, perPage, type, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch media from AniList (page ${page}, type ${type}): ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * GraphQL query to fetch single media by ID from AniList
   * Uses fragment to avoid code duplication
   */
  private getMediaByIdQuery(): string {
    return `
      ${this.getMediaFieldsFragment()}
      query ($id: Int) {
        Media(id: $id) {
          ...mediaFields
        }
      }
    `;
  }

  /**
   * Fetch single media by ID from AniList API
   *
   * @param id - AniList media ID
   * @returns Promise with AniList media data or null if not found
   */
  async getMediaById(
    id: number,
    retryCount: number = 0,
  ): Promise<AniListMedia | null> {
    const query = this.getMediaByIdQuery();
    const variables = {
      id,
    };

    try {
      // Get authorization headers (with access token if available)
      const headers = await this.getAuthHeaders();

      // HttpService from @nestjs/axios uses post(url, data, config)
      const response = await firstValueFrom(
        this.httpService.post<AniListMediaResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables,
          },
          {
            headers,
          },
        ),
      );

      // Handle rate limiting from response headers
      if (response.headers) {
        await this.handleRateLimit(response.headers);
      }

      // HttpService returns { data: {...}, status: 200, ... }
      const responseData = response.data;

      // Handle GraphQL response structure
      if (responseData.errors && responseData.errors.length > 0) {
        // Check for rate limit error (429)
        const rateLimitError = responseData.errors.find(
          (e: { status?: number; message?: string }) => e.status === 429,
        );
        if (rateLimitError && retryCount < 3) {
          const retryAfter = response.headers?.['retry-after']
            ? parseInt(String(response.headers['retry-after']), 10)
            : undefined;
          const rateLimitReset = response.headers?.['x-ratelimit-reset']
            ? parseInt(String(response.headers['x-ratelimit-reset']), 10)
            : undefined;

          await this.handleRateLimitError(retryAfter, rateLimitReset);
          // Retry the request
          return this.getMediaById(id, retryCount + 1);
        }

        const errorMessages = responseData.errors
          .map((e: { message?: string }) => e.message || 'Unknown error')
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      if (!responseData.data || !responseData.data.Media) {
        return null;
      }

      return responseData.data.Media;
    } catch (error: unknown) {
      // Handle HTTP 429 errors
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 429 &&
        retryCount < 3
      ) {
        const response = error.response as {
          status: number;
          headers?: Record<string, string | string[] | undefined>;
        };
        const retryAfterHeader = response.headers?.['retry-after'];
        const retryAfter = retryAfterHeader
          ? parseInt(
              Array.isArray(retryAfterHeader)
                ? retryAfterHeader[0]
                : retryAfterHeader,
              10,
            )
          : undefined;
        const rateLimitResetHeader = response.headers?.['x-ratelimit-reset'];
        const rateLimitReset = rateLimitResetHeader
          ? parseInt(
              Array.isArray(rateLimitResetHeader)
                ? rateLimitResetHeader[0]
                : rateLimitResetHeader,
              10,
            )
          : undefined;

        await this.handleRateLimitError(retryAfter, rateLimitReset);
        // Retry the request
        return this.getMediaById(id, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch media from AniList (id: ${id}): ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Send AniList media ID to queue for fetching and saving
   *
   * This method sends the AniList media ID to RabbitMQ queue for asynchronous processing.
   * Worker will fetch the media data from AniList API and save it to the database.
   *
   * @param id - AniList media ID to fetch and save
   * @returns Promise with the job ID
   * @throws Error if queue sending fails
   */
  async fetchAndSaveMediaById(id: number): Promise<string> {
    try {
      // Check if RabbitMQ service is available
      if (!this.rabbitMQService) {
        throw new Error('RabbitMQ service is not available');
      }

      // Create job with only the AniList ID
      // Worker will fetch the data from AniList API
      const jobId = generateJobId();
      const job: SeriesSaveJob = {
        jobId,
        aniListId: id,
        timestamp: new Date().toISOString(),
      };

      // Send job to RabbitMQ queue
      const success = await this.rabbitMQService.sendDataToRabbitMQAsync(
        JOB_NAME.SERIES_SAVE,
        job as unknown,
      );

      if (!success) {
        throw new Error(`Failed to send series save job to queue: ${jobId}`);
      }

      this.logger.log(`Series save job queued: ${jobId} (AniList ID: ${id})`);

      return jobId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to queue media save job (AniList ID: ${id}): ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Process and save series from AniList media data
   *
   * This method is called by worker to process the series save job.
   * It maps AniList media data to Series entity format and saves it to the database.
   *
   * @param anilistMedia - AniList media data to process
   * @returns Promise with the saved Series entity
   * @throws Error if mapping or saving fails
   */
  async processAndSaveSeriesFromAniListMedia(
    anilistMedia: AniListMedia,
  ): Promise<Series> {
    try {
      // Map AniList media data to Series entity format
      const seriesData = this.mapAniListMediaToSeries(anilistMedia);

      // Save or update the series in the database
      const savedSeries = await this.saveOrUpdateSeries(seriesData);

      this.logger.log(
        `Successfully processed and saved series: ${savedSeries.id} (AniList ID: ${anilistMedia.id})`,
      );

      return savedSeries;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process and save series (AniList ID: ${anilistMedia.id}): ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Convert AniList FuzzyDate to JavaScript Date
   *
   * @param fuzzyDate - AniList fuzzy date object
   * @returns Date object or undefined
   */
  private fuzzyDateToDate(fuzzyDate?: AniListFuzzyDate): Date | undefined {
    if (!fuzzyDate || !fuzzyDate.year) {
      return undefined;
    }

    // Use first day of month if day is missing, first month if month is missing
    const year = fuzzyDate.year;
    const month = fuzzyDate.month ? fuzzyDate.month - 1 : 0; // JavaScript months are 0-indexed
    const day = fuzzyDate.day || 1;

    return new Date(Date.UTC(year, month, day));
  }

  /**
   * Map AniList Media type to Series type
   *
   * @param anilistType - AniList media type
   * @returns Series type string
   */
  private mapMediaType(anilistType: string): string {
    const typeMap: Record<string, string> = {
      ANIME: SERIES_CONSTANTS.TYPE.ANIME,
      MANGA: SERIES_CONSTANTS.TYPE.MANGA,
    };
    return typeMap[anilistType] || SERIES_CONSTANTS.TYPE.OTHER;
  }

  /**
   * Map AniList format to Series format
   *
   * @param anilistFormat - AniList format string
   * @returns Series format string or undefined
   */
  private mapFormat(anilistFormat?: string): string | undefined {
    if (!anilistFormat) return undefined;

    const formatMap: Record<string, string> = {
      TV: SERIES_CONSTANTS.FORMAT.TV,
      TV_SHORT: SERIES_CONSTANTS.FORMAT.TV_SHORT,
      MOVIE: SERIES_CONSTANTS.FORMAT.MOVIE,
      SPECIAL: SERIES_CONSTANTS.FORMAT.SPECIAL,
      OVA: SERIES_CONSTANTS.FORMAT.OVA,
      ONA: SERIES_CONSTANTS.FORMAT.ONA,
      MUSIC: SERIES_CONSTANTS.FORMAT.MUSIC,
      MANGA: SERIES_CONSTANTS.FORMAT.MANGA,
      NOVEL: SERIES_CONSTANTS.FORMAT.NOVEL,
      ONE_SHOT: SERIES_CONSTANTS.FORMAT.ONE_SHOT,
    };

    return formatMap[anilistFormat] || undefined;
  }

  /**
   * Map AniList status to Series releasing status
   *
   * @param anilistStatus - AniList status string
   * @returns Series releasing status string or undefined
   */
  private mapStatus(anilistStatus?: string): string | undefined {
    if (!anilistStatus) return undefined;

    const statusMap: Record<string, string> = {
      FINISHED: SERIES_CONSTANTS.RELEASING_STATUS.FINISHED,
      RELEASING: SERIES_CONSTANTS.RELEASING_STATUS.RELEASING,
      NOT_YET_RELEASED: SERIES_CONSTANTS.RELEASING_STATUS.NOT_YET_RELEASED,
      CANCELLED: SERIES_CONSTANTS.RELEASING_STATUS.CANCELLED,
      HIATUS: SERIES_CONSTANTS.RELEASING_STATUS.HIATUS,
    };

    return statusMap[anilistStatus] || undefined;
  }

  /**
   * Map AniList source to Series source
   *
   * @param anilistSource - AniList source string
   * @returns Series source string or undefined
   */
  private mapSource(anilistSource?: string): string | undefined {
    if (!anilistSource) return undefined;

    const sourceMap: Record<string, string> = {
      ORIGINAL: SERIES_CONSTANTS.SOURCE.ORIGINAL,
      MANGA: SERIES_CONSTANTS.SOURCE.MANGA,
      LIGHT_NOVEL: SERIES_CONSTANTS.SOURCE.LIGHT_NOVEL,
      VISUAL_NOVEL: SERIES_CONSTANTS.SOURCE.VISUAL_NOVEL,
      VIDEO_GAME: SERIES_CONSTANTS.SOURCE.VIDEO_GAME,
      OTHER: SERIES_CONSTANTS.SOURCE.OTHER,
      NOVEL: SERIES_CONSTANTS.SOURCE.NOVEL,
      DOUJINSHI: SERIES_CONSTANTS.SOURCE.DOUJINSHI,
      ANIME: SERIES_CONSTANTS.SOURCE.ANIME,
      WEB_NOVEL: SERIES_CONSTANTS.SOURCE.WEB_NOVEL,
      LIVE_ACTION: SERIES_CONSTANTS.SOURCE.LIVE_ACTION,
      GAME: SERIES_CONSTANTS.SOURCE.GAME,
      COMIC: SERIES_CONSTANTS.SOURCE.COMIC,
      MULTIMEDIA_PROJECT: SERIES_CONSTANTS.SOURCE.MULTIMEDIA_PROJECT,
      PICTURE_BOOK: SERIES_CONSTANTS.SOURCE.PICTURE_BOOK,
    };

    return sourceMap[anilistSource] || undefined;
  }

  /**
   * Map AniList season to Series season
   *
   * @param anilistSeason - AniList season string
   * @returns Series season string or undefined
   */
  private mapSeason(anilistSeason?: string): string | undefined {
    if (!anilistSeason) return undefined;

    const seasonMap: Record<string, string> = {
      WINTER: SERIES_CONSTANTS.SEASON.WINTER,
      SPRING: SERIES_CONSTANTS.SEASON.SPRING,
      SUMMER: SERIES_CONSTANTS.SEASON.SUMMER,
      FALL: SERIES_CONSTANTS.SEASON.FALL,
    };

    return seasonMap[anilistSeason] || undefined;
  }

  /**
   * Convert external links array to object
   * Stores full link information in metadata, but also creates simple key-value map
   *
   * @param externalLinks - Array of external links
   * @returns Object with site as key and URL as value
   */
  private convertExternalLinks(
    externalLinks?: AniListExternalLink[],
  ): Record<string, string> | undefined {
    if (!externalLinks || externalLinks.length === 0) {
      return undefined;
    }

    const links: Record<string, string> = {};
    for (const link of externalLinks) {
      if (link.site && link.url && !link.isDisabled) {
        links[link.site] = link.url;
      }
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  /**
   * Convert streaming episodes array to object
   * Creates a simple key-value map for the streamingEpisodes field (site -> url)
   * Full episode data (including title and thumbnail) is preserved in metadata
   *
   * @param streamingEpisodes - Array of streaming episodes
   * @returns Object with site as key and URL as value
   */
  private convertStreamingEpisodes(
    streamingEpisodes?: AniListStreamingEpisode[],
  ): Record<string, string> | undefined {
    if (!streamingEpisodes || streamingEpisodes.length === 0) {
      return undefined;
    }

    const episodes: Record<string, string> = {};
    for (const episode of streamingEpisodes) {
      if (episode.site && episode.url) {
        episodes[episode.site] = episode.url;
      }
    }

    return Object.keys(episodes).length > 0 ? episodes : undefined;
  }

  /**
   * Map AniList Media to Series entity
   *
   * @param anilistMedia - AniList media object
   * @returns Series entity data
   */
  private mapAniListMediaToSeries(anilistMedia: AniListMedia): Partial<Series> {
    const seriesData: Partial<Series> = {
      aniListId: anilistMedia.id.toString(),
      myAnimeListId:
        anilistMedia.idMal !== null && anilistMedia.idMal !== undefined
          ? anilistMedia.idMal.toString()
          : undefined,
      title: {
        romaji: anilistMedia.title?.romaji,
        english: anilistMedia.title?.english,
        native: anilistMedia.title?.native,
        userPreferred: anilistMedia.title?.userPreferred,
      },
      type: this.mapMediaType(anilistMedia.type),
      format: this.mapFormat(anilistMedia.format),
      status: this.mapStatus(anilistMedia.status),
      description: anilistMedia.description || undefined,
      startDate: this.fuzzyDateToDate(anilistMedia.startDate),
      endDate: this.fuzzyDateToDate(anilistMedia.endDate),
      season: this.mapSeason(anilistMedia.season),
      seasonYear: anilistMedia.seasonYear || undefined,
      episodes: anilistMedia.episodes || undefined,
      duration: anilistMedia.duration || undefined,
      chapters: anilistMedia.chapters || undefined,
      volumes: anilistMedia.volumes || undefined,
      countryOfOrigin: anilistMedia.countryOfOrigin || undefined,
      isLicensed: anilistMedia.isLicensed || undefined,
      source: this.mapSource(anilistMedia.source),
      synonyms:
        anilistMedia.synonyms && anilistMedia.synonyms.length > 0
          ? anilistMedia.synonyms
          : undefined,
      averageScore: anilistMedia.averageScore || undefined,
      meanScore: anilistMedia.meanScore || undefined,
      popularity: anilistMedia.popularity || 0,
      isLocked: anilistMedia.isLocked || false,
      trending: anilistMedia.trending || 0,
      isNsfw: anilistMedia.isAdult || false,
      externalLinks: this.convertExternalLinks(anilistMedia.externalLinks),
      streamingEpisodes: this.convertStreamingEpisodes(
        anilistMedia.streamingEpisodes,
      ),
      autoCreateForumThread: anilistMedia.autoCreateForumThread || undefined,
      isRecommendationBlocked:
        anilistMedia.isRecommendationBlocked || undefined,
      isReviewBlocked: anilistMedia.isReviewBlocked || undefined,
      notes: anilistMedia.modNotes || undefined,
      metadata: {
        coverImage:
          anilistMedia.coverImage &&
          Object.keys(anilistMedia.coverImage).length > 0
            ? anilistMedia.coverImage
            : undefined,
        bannerImage: anilistMedia.bannerImage || undefined,
        genres:
          anilistMedia.genres && anilistMedia.genres.length > 0
            ? anilistMedia.genres
            : undefined,
        tags:
          anilistMedia.tags && anilistMedia.tags.length > 0
            ? anilistMedia.tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                description: tag.description,
                category: tag.category,
                rank: tag.rank,
                isGeneralSpoiler: tag.isGeneralSpoiler,
                isMediaSpoiler: tag.isMediaSpoiler,
                isAdult: tag.isAdult,
              }))
            : undefined,
        externalLinks:
          anilistMedia.externalLinks && anilistMedia.externalLinks.length > 0
            ? anilistMedia.externalLinks.map((link) => ({
                id: link.id,
                site: link.site,
                url: link.url,
                type: link.type,
                language: link.language || undefined,
                color: link.color || undefined,
                icon: link.icon || undefined,
                notes: link.notes || undefined,
                isDisabled: link.isDisabled,
              }))
            : undefined,
        siteUrl: anilistMedia.siteUrl,
        updatedAt: anilistMedia.updatedAt
          ? new Date(anilistMedia.updatedAt * 1000).toISOString()
          : undefined,
        favourites: anilistMedia.favourites,
        trailer: anilistMedia.trailer
          ? {
              id: anilistMedia.trailer.id,
              site: anilistMedia.trailer.site,
              thumbnail: anilistMedia.trailer.thumbnail,
            }
          : undefined,
        nextAiringEpisode: anilistMedia.nextAiringEpisode
          ? {
              id: anilistMedia.nextAiringEpisode.id,
              airingAt: anilistMedia.nextAiringEpisode.airingAt
                ? new Date(
                    anilistMedia.nextAiringEpisode.airingAt * 1000,
                  ).toISOString()
                : undefined,
              timeUntilAiring: anilistMedia.nextAiringEpisode.timeUntilAiring,
              episode: anilistMedia.nextAiringEpisode.episode,
              mediaId: anilistMedia.nextAiringEpisode.mediaId,
            }
          : undefined,
        studios:
          anilistMedia.studios &&
          anilistMedia.studios.edges &&
          anilistMedia.studios.edges.length > 0
            ? anilistMedia.studios.edges.map((edge) => ({
                id: edge.node.id,
                name: edge.node.name,
                isMain: edge.isMain,
                isAnimationStudio: edge.node.isAnimationStudio,
                siteUrl: edge.node.siteUrl,
                favourites: edge.node.favourites,
              }))
            : undefined,
        staff:
          anilistMedia.staff?.edges && anilistMedia.staff.edges.length > 0
            ? anilistMedia.staff.edges.map((edge) => ({
                id: edge.node.id,
                role: edge.role,
                name: edge.node.name,
                language: edge.node.language,
                image: edge.node.image,
                description: edge.node.description,
                primaryOccupations: edge.node.primaryOccupations,
                gender: edge.node.gender,
                dateOfBirth: edge.node.dateOfBirth,
                dateOfDeath: edge.node.dateOfDeath,
                age: edge.node.age,
                yearsActive: edge.node.yearsActive,
                homeTown: edge.node.homeTown,
                siteUrl: edge.node.siteUrl,
                favourites: edge.node.favourites,
              }))
            : undefined,
        characters:
          anilistMedia.characters?.edges &&
          anilistMedia.characters.edges.length > 0
            ? anilistMedia.characters.edges.map((edge) => ({
                id: edge.node.id,
                role: edge.role,
                name: edge.name || undefined,
                characterName: edge.node.name,
                image: edge.node.image,
                description: edge.node.description,
                gender: edge.node.gender,
                dateOfBirth: edge.node.dateOfBirth,
                age: edge.node.age,
                bloodType: edge.node.bloodType,
                siteUrl: edge.node.siteUrl,
                favourites: edge.node.favourites,
                modNotes: edge.node.modNotes,
                voiceActors:
                  edge.voiceActors && edge.voiceActors.length > 0
                    ? edge.voiceActors.map((va) => ({
                        id: va.id,
                        name: va.name,
                        language: va.language,
                        image: va.image,
                      }))
                    : undefined,
              }))
            : undefined,
        relations:
          anilistMedia.relations?.edges &&
          anilistMedia.relations.edges.length > 0
            ? anilistMedia.relations.edges.map((edge) => ({
                id: edge.node.id,
                relationType: edge.relationType,
                mediaId: edge.node.id,
                type: edge.node.type,
                title: edge.node.title,
                format: edge.node.format,
                status: edge.node.status,
                coverImage: edge.node.coverImage,
              }))
            : undefined,
        recommendations:
          anilistMedia.recommendations?.edges &&
          anilistMedia.recommendations.edges.length > 0
            ? anilistMedia.recommendations.edges.map((edge) => ({
                id: edge.node.id,
                rating: edge.node.rating,
                userRating: edge.node.userRating,
                mediaRecommendation: edge.node.mediaRecommendation
                  ? {
                      id: edge.node.mediaRecommendation.id,
                      type: edge.node.mediaRecommendation.type,
                      title: edge.node.mediaRecommendation.title,
                      format: edge.node.mediaRecommendation.format,
                      status: edge.node.mediaRecommendation.status,
                      coverImage: edge.node.mediaRecommendation.coverImage,
                    }
                  : undefined,
                user: edge.node.user
                  ? {
                      id: edge.node.user.id,
                      name: edge.node.user.name,
                    }
                  : undefined,
              }))
            : undefined,
        stats: anilistMedia.stats
          ? {
              scoreDistribution:
                anilistMedia.stats.scoreDistribution &&
                anilistMedia.stats.scoreDistribution.length > 0
                  ? anilistMedia.stats.scoreDistribution
                  : undefined,
              statusDistribution:
                anilistMedia.stats.statusDistribution &&
                anilistMedia.stats.statusDistribution.length > 0
                  ? anilistMedia.stats.statusDistribution
                  : undefined,
            }
          : undefined,
        rankings:
          anilistMedia.rankings && anilistMedia.rankings.length > 0
            ? anilistMedia.rankings.map((ranking) => ({
                id: ranking.id,
                rank: ranking.rank,
                type: ranking.type,
                format: ranking.format,
                year: ranking.year,
                season: ranking.season,
                allTime: ranking.allTime,
                context: ranking.context,
              }))
            : undefined,
        reviews: anilistMedia.reviews
          ? {
              nodes:
                anilistMedia.reviews.nodes &&
                anilistMedia.reviews.nodes.length > 0
                  ? anilistMedia.reviews.nodes.map((review) => ({
                      id: review.id,
                      summary: review.summary,
                      body: review.body,
                      rating: review.rating,
                      ratingAmount: review.ratingAmount,
                      user: review.user
                        ? {
                            id: review.user.id,
                            name: review.user.name,
                          }
                        : undefined,
                      createdAt: review.createdAt
                        ? new Date(review.createdAt * 1000).toISOString()
                        : undefined,
                      updatedAt: review.updatedAt
                        ? new Date(review.updatedAt * 1000).toISOString()
                        : undefined,
                    }))
                  : undefined,
              pageInfo: anilistMedia.reviews.pageInfo,
            }
          : undefined,
        mediaListEntry: anilistMedia.mediaListEntry
          ? {
              id: anilistMedia.mediaListEntry.id,
              status: anilistMedia.mediaListEntry.status,
              score: anilistMedia.mediaListEntry.score,
              progress: anilistMedia.mediaListEntry.progress,
              progressVolumes: anilistMedia.mediaListEntry.progressVolumes,
              repeat: anilistMedia.mediaListEntry.repeat,
              priority: anilistMedia.mediaListEntry.priority,
              private: anilistMedia.mediaListEntry.private,
              notes: anilistMedia.mediaListEntry.notes,
              hiddenFromStatusLists:
                anilistMedia.mediaListEntry.hiddenFromStatusLists,
              customLists: anilistMedia.mediaListEntry.customLists,
              advancedScores: anilistMedia.mediaListEntry.advancedScores,
              startedAt: anilistMedia.mediaListEntry.startedAt,
              completedAt: anilistMedia.mediaListEntry.completedAt,
              updatedAt: anilistMedia.mediaListEntry.updatedAt
                ? new Date(
                    anilistMedia.mediaListEntry.updatedAt * 1000,
                  ).toISOString()
                : undefined,
              createdAt: anilistMedia.mediaListEntry.createdAt
                ? new Date(
                    anilistMedia.mediaListEntry.createdAt * 1000,
                  ).toISOString()
                : undefined,
            }
          : undefined,
        hashtag: anilistMedia.hashtag || undefined,
        isFavourite: anilistMedia.isFavourite || false,
        isFavouriteBlocked: anilistMedia.isFavouriteBlocked || false,
        streamingEpisodes:
          anilistMedia.streamingEpisodes &&
          anilistMedia.streamingEpisodes.length > 0
            ? anilistMedia.streamingEpisodes.map((episode) => ({
                title: episode.title || undefined,
                thumbnail: episode.thumbnail || undefined,
                url: episode.url || undefined,
                site: episode.site || undefined,
              }))
            : undefined,
      },
    };

    return seriesData;
  }

  /**
   * Save or update a series in the database
   *
   * @param seriesData - Series data to save
   * @returns Saved series entity
   */
  private async saveOrUpdateSeries(
    seriesData: Partial<Series>,
  ): Promise<Series> {
    if (!seriesData.aniListId) {
      throw new Error('aniListId is required to save series');
    }

    // Find existing series by aniListId
    const existingSeries = await this.seriesRepository.findOne({
      where: { aniListId: seriesData.aniListId },
    });

    if (existingSeries) {
      // Update existing series
      Object.assign(existingSeries, seriesData);
      return await this.seriesRepository.save(existingSeries);
    } else {
      // Create new series
      const newSeries = this.seriesRepository.create(seriesData);
      return await this.seriesRepository.save(newSeries);
    }
  }

  /**
   * Trigger crawl job for AniList media
   *
   * This method only sends a crawl job to RabbitMQ queue.
   * Worker will handle the actual crawling process (fetching pages and queuing individual media save jobs).
   *
   * @param type - Media type to crawl (ANIME or MANGA)
   * @param maxPages - Maximum number of pages to crawl (0 = all pages)
   * @returns Promise with the job ID
   * @throws Error if queue sending fails
   */
  async crawlAniListMedia(
    type: 'ANIME' | 'MANGA' = 'ANIME',
    maxPages: number = 0,
  ): Promise<string> {
    // Check if RabbitMQ service is available
    if (!this.rabbitMQService) {
      throw new Error('RabbitMQ service is not available');
    }

    // Create crawl job to send to queue
    const jobId = generateJobId();
    const job: SeriesCrawlJob = {
      jobId,
      type,
      maxPages,
      timestamp: new Date().toISOString(),
    };

    // Send job to RabbitMQ queue
    const success = await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.SERIES_CRAWL,
      job as unknown,
    );

    if (!success) {
      throw new Error(`Failed to send series crawl job to queue: ${jobId}`);
    }

    this.logger.log(
      `Series crawl job queued: ${jobId} (Type: ${type}, MaxPages: ${maxPages})`,
    );

    return jobId;
  }

  /**
   * Process crawl job - fetches pages and queues individual media save jobs
   *
   * This method is called by worker to process the crawl job.
   * It fetches media pages from AniList API and queues individual media save jobs.
   *
   * @param type - Media type to crawl (ANIME or MANGA)
   * @param maxPages - Maximum number of pages to crawl (0 = all pages)
   * @returns Promise with crawl statistics
   */
  async processCrawlJob(
    type: 'ANIME' | 'MANGA',
    maxPages: number,
  ): Promise<{
    totalFetched: number;
    totalQueued: number;
    errors: number;
  }> {
    this.logger.log(
      `Processing crawl job for type: ${type}, maxPages: ${maxPages === 0 ? 'ALL' : maxPages}`,
    );

    // Check if RabbitMQ service is available
    if (!this.rabbitMQService) {
      throw new Error('RabbitMQ service is not available');
    }

    let currentPage = 1;
    let hasNextPage = true;
    let totalFetched = 0;
    let totalQueued = 0;
    let errors = 0;

    try {
      // Crawl all pages if maxPages is 0
      while (hasNextPage && (maxPages === 0 || currentPage <= maxPages)) {
        this.logger.log(
          `Fetching page ${currentPage} of ${type} media from AniList... (Rate limit: ${this.rateLimitRemaining}/${this.rateLimitLimit} remaining)`,
        );

        const pageData = await this.fetchMediaFromAniList(
          currentPage,
          this.PER_PAGE,
          type,
        );

        const mediaList = pageData.Page.media;
        const pageInfo = pageData.Page.pageInfo;

        this.logger.log(
          `Fetched ${mediaList.length} media items from page ${currentPage}`,
        );

        // Queue each media item for processing by worker
        for (const media of mediaList) {
          try {
            // Send media ID to queue for saving
            await this.fetchAndSaveMediaById(media.id);
            totalQueued++;
            totalFetched++;
          } catch (error: unknown) {
            errors++;
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Failed to queue media ${media.id}: ${errorMessage}`,
            );
          }
        }

        // Check if there are more pages
        hasNextPage = pageInfo.hasNextPage;
        currentPage++;

        // Log progress
        if (hasNextPage) {
          this.logger.log(
            `Page ${currentPage - 1} completed. ${totalFetched} items fetched, ${totalQueued} queued. Rate limit: ${this.rateLimitRemaining}/${this.rateLimitLimit} remaining.`,
          );
        }
      }

      this.logger.log(
        `Crawl job completed for ${type}. Total pages: ${currentPage - 1}, Fetched: ${totalFetched}, Queued: ${totalQueued}, Errors: ${errors}`,
      );

      return {
        totalFetched,
        totalQueued,
        errors,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Crawl job failed for ${type}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Cron job to crawl AniList data periodically
   * Runs daily at 2 AM to fetch latest media data
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledCrawl(): Promise<void> {
    this.logger.log('Starting scheduled AniList crawl job');

    try {
      // Crawl anime (limit to first 10 pages = 500 items per run to avoid long execution)
      const animeStats = await this.crawlAniListMedia('ANIME', 10);
      this.logger.log(`Anime crawl completed: ${JSON.stringify(animeStats)}`);

      // Add delay between types
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay

      // Crawl manga (limit to first 10 pages = 500 items per run)
      const mangaStats = await this.crawlAniListMedia('MANGA', 10);
      this.logger.log(`Manga crawl completed: ${JSON.stringify(mangaStats)}`);

      this.logger.log('Scheduled AniList crawl job completed successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Scheduled AniList crawl job failed: ${errorMessage}`);
    }
  }

  /**
   * Manual crawl method for testing or on-demand updates
   *
   * This method triggers a crawl job by sending it to queue.
   * Worker will handle the actual crawling process.
   *
   * @param type - Media type to crawl
   * @param maxPages - Maximum number of pages to crawl
   * @returns Promise with the job ID
   */
  async manualCrawl(
    type: 'ANIME' | 'MANGA' = 'ANIME',
    maxPages: number = 1,
  ): Promise<string> {
    return this.crawlAniListMedia(type, maxPages);
  }

  /**
   * Get a single MediaList entry by ID
   *
   * @param id - MediaList entry ID
   * @returns Promise with MediaList entry or null
   */
  async getMediaListEntryById(
    id: number,
  ): Promise<AniListMediaListEntry | null> {
    const query = `
      query ($id: Int) {
        MediaList(id: $id) {
          id
          userId
          mediaId
          status
          score
          progress
          progressVolumes
          repeat
          priority
          private
          notes
          hiddenFromStatusLists
          customLists
          advancedScores
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
          updatedAt
          createdAt
          media {
            id
            title {
              romaji
              english
              native
            }
          }
        }
      }
    `;

    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.post<AniListMediaListResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables: { id },
          },
          { headers },
        ),
      );

      const responseData = response.data;

      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      return responseData.data?.MediaList || null;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get MediaList entry: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get a MediaList entry by media ID and user ID
   *
   * @param mediaId - AniList media ID
   * @param userId - AniList user ID
   * @returns Promise with MediaList entry or null
   */
  async getMediaListEntryByMediaAndUser(
    mediaId: number,
    userId: number,
  ): Promise<AniListMediaListEntry | null> {
    const query = `
      query ($mediaId: Int, $userId: Int) {
        MediaList(mediaId: $mediaId, userId: $userId) {
          id
          userId
          mediaId
          status
          score
          progress
          progressVolumes
          repeat
          priority
          private
          notes
          hiddenFromStatusLists
          customLists
          advancedScores
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
          updatedAt
          createdAt
          media {
            id
            title {
              romaji
              english
              native
            }
          }
        }
      }
    `;

    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.post<AniListMediaListResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables: { mediaId, userId },
          },
          { headers },
        ),
      );

      const responseData = response.data;

      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      return responseData.data?.MediaList || null;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get MediaList entry: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get paginated MediaList entries
   *
   * @param userId - AniList user ID
   * @param type - Media type (ANIME or MANGA)
   * @param status - Optional status filter
   * @param page - Page number
   * @param perPage - Items per page (max 50)
   * @returns Promise with paginated MediaList entries
   */
  async getMediaList(
    userId: number,
    type: 'ANIME' | 'MANGA',
    status?: string,
    page: number = 1,
    perPage: number = 50,
  ): Promise<{
    entries: AniListMediaListEntry[];
    pageInfo: AniListPageInfo;
  }> {
    const query = `
      query ($userId: Int, $type: MediaType, $status: MediaListStatus, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          mediaList(userId: $userId, type: $type, status: $status, sort: UPDATED_TIME_DESC) {
            id
            userId
            mediaId
            status
            score
            progress
            progressVolumes
            repeat
            priority
            private
            notes
            hiddenFromStatusLists
            customLists
            advancedScores
            startedAt {
              year
              month
              day
            }
            completedAt {
              year
              month
              day
            }
            updatedAt
            createdAt
            media {
              id
              title {
                romaji
                english
                native
              }
              type
              format
              coverImage {
                large
                medium
              }
            }
          }
        }
      }
    `;

    const variables: Record<string, unknown> = {
      userId,
      type,
      page,
      perPage: Math.min(perPage, 50), // AniList max is 50
    };

    if (status) {
      variables.status = status;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.post<AniListMediaListResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables,
          },
          { headers },
        ),
      );

      const responseData = response.data;

      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      const pageData = responseData.data?.Page;
      if (!pageData) {
        throw new Error('No data returned from AniList API');
      }

      return {
        entries: pageData.mediaList || [],
        pageInfo: pageData.pageInfo,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get MediaList: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get full MediaList collection for a user
   * Returns the complete list split by status and custom lists
   *
   * @param userId - AniList user ID
   * @param type - Media type (ANIME or MANGA)
   * @returns Promise with MediaList collection
   */
  async getMediaListCollection(
    userId: number,
    type: 'ANIME' | 'MANGA',
  ): Promise<AniListMediaListCollection> {
    const query = `
      query ($userId: Int!, $type: MediaType!) {
        MediaListCollection(userId: $userId, type: $type) {
          lists {
            name
            isCustomList
            isSplitCompletedList
            status
            entries {
              id
              userId
              mediaId
              status
              score
              progress
              progressVolumes
              repeat
              priority
              private
              notes
              hiddenFromStatusLists
              customLists
              advancedScores
              startedAt {
                year
                month
                day
              }
              completedAt {
                year
                month
                day
              }
              updatedAt
              createdAt
              media {
                id
                title {
                  romaji
                  english
                  native
                }
                type
                format
                coverImage {
                  large
                  medium
                }
              }
            }
          }
          hasNextChunk
          user {
            id
            name
            mediaListOptions {
              scoreFormat
              rowOrder
              animeList {
                sectionOrder
                splitCompletedSectionByFormat
                customLists
                advancedScoring
                advancedScoringEnabled
              }
              mangaList {
                sectionOrder
                splitCompletedSectionByFormat
                customLists
                advancedScoring
                advancedScoringEnabled
              }
            }
          }
        }
      }
    `;

    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.post<AniListMediaListResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables: { userId, type },
          },
          { headers },
        ),
      );

      const responseData = response.data;

      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      const collection = responseData.data?.MediaListCollection;
      if (!collection) {
        throw new Error('No data returned from AniList API');
      }

      return collection;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get MediaList collection: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get MediaList entry from Media object (requires authentication)
   * This returns the list entry for the authenticated user
   *
   * @param mediaId - AniList media ID
   * @returns Promise with MediaList entry or null
   */
  async getMediaListEntryFromMedia(
    mediaId: number,
  ): Promise<AniListMediaListEntry | null> {
    const query = `
      query ($id: Int!) {
        Media(id: $id) {
          id
          title {
            romaji
            english
            native
          }
          mediaListEntry {
            id
            userId
            mediaId
            status
            score
            progress
            progressVolumes
            repeat
            priority
            private
            notes
            hiddenFromStatusLists
            customLists
            advancedScores
            startedAt {
              year
              month
              day
            }
            completedAt {
              year
              month
              day
            }
            updatedAt
            createdAt
          }
        }
      }
    `;

    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.post<AniListMediaListResponse>(
          this.ANILIST_API_URL,
          {
            query,
            variables: { id: mediaId },
          },
          { headers },
        ),
      );

      const responseData = response.data;

      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      // Note: This query returns Media object, not MediaList directly
      // We need to extract mediaListEntry from the response
      const media = responseData.data?.Media;
      if (!media) {
        return null;
      }
      return media.mediaListEntry || null;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get MediaList entry from Media: ${errorMessage}`,
      );
      throw error;
    }
  }
}
