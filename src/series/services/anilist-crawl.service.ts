import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { Series } from '../entities/series.entity';

/**
 * AniList GraphQL API Response Types
 */
export interface AniListMediaTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AniListFuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AniListMediaCoverImage {
  large?: string;
  medium?: string;
  color?: string;
  extraLarge?: string;
}

export interface AniListStudio {
  id: number;
  name: string;
  isAnimationStudio?: boolean;
  siteUrl?: string;
  favourites?: number;
}

export interface AniListStudioEdge {
  id?: number;
  isMain?: boolean;
  node: AniListStudio;
}

export interface AniListStaffName {
  first?: string;
  middle?: string;
  last?: string;
  full?: string;
  native?: string;
  alternative?: string[];
  userPreferred?: string;
}

export interface AniListStaffImage {
  large?: string;
  medium?: string;
}

export interface AniListStaff {
  id: number;
  name?: AniListStaffName;
  language?: string;
  image?: AniListStaffImage;
  description?: string;
  primaryOccupations?: string[];
  gender?: string;
  dateOfBirth?: AniListFuzzyDate;
  dateOfDeath?: AniListFuzzyDate;
  age?: number;
  yearsActive?: number[];
  homeTown?: string;
  siteUrl?: string;
  favourites?: number;
}

export interface AniListStaffEdge {
  id?: number;
  role?: string;
  node: AniListStaff;
}

export interface AniListCharacterName {
  first?: string;
  middle?: string;
  last?: string;
  full?: string;
  native?: string;
  alternative?: string[];
  userPreferred?: string;
}

export interface AniListCharacterImage {
  large?: string;
  medium?: string;
}

export interface AniListCharacter {
  id: number;
  name?: AniListCharacterName;
  image?: AniListCharacterImage;
  description?: string;
  gender?: string;
  dateOfBirth?: AniListFuzzyDate;
  age?: string;
  bloodType?: string;
  siteUrl?: string;
  favourites?: number;
  modNotes?: string;
}

export interface AniListVoiceActor {
  id: number;
  name?: AniListStaffName;
  language?: string;
  image?: AniListStaffImage;
}

export interface AniListCharacterEdge {
  id?: number;
  role?: string;
  name?: string;
  voiceActors?: AniListVoiceActor[];
  node: AniListCharacter;
}

export interface AniListMediaRelation {
  id: number;
  type?: string;
  title?: AniListMediaTitle;
  format?: string;
  status?: string;
  coverImage?: AniListMediaCoverImage;
}

export interface AniListRelationEdge {
  id?: number;
  relationType?: string;
  node: AniListMediaRelation;
}

export interface AniListRecommendationUser {
  id: number;
  name?: string;
}

export interface AniListRecommendation {
  id: number;
  rating?: number;
  userRating?: string;
  mediaRecommendation?: AniListMediaRelation;
  user?: AniListRecommendationUser;
}

export interface AniListRecommendationEdge {
  node: AniListRecommendation;
}

export interface AniListScoreDistribution {
  score?: number;
  amount?: number;
}

export interface AniListStatusDistribution {
  status?: string;
  amount?: number;
}

export interface AniListMediaStats {
  scoreDistribution?: AniListScoreDistribution[];
  statusDistribution?: AniListStatusDistribution[];
}

export interface AniListRanking {
  id?: number;
  rank?: number;
  type?: string;
  format?: string;
  year?: number;
  season?: string;
  allTime?: boolean;
  context?: string;
}

export interface AniListReviewUser {
  id: number;
  name?: string;
}

export interface AniListReview {
  id: number;
  summary?: string;
  body?: string;
  rating?: number;
  ratingAmount?: number;
  user?: AniListReviewUser;
  createdAt?: number;
  updatedAt?: number;
}

export interface AniListReviews {
  nodes?: AniListReview[];
  pageInfo?: AniListPageInfo;
}

export interface AniListMediaTag {
  id: number;
  name: string;
  description?: string;
  category?: string;
  rank?: number;
  isGeneralSpoiler?: boolean;
  isMediaSpoiler?: boolean;
  isAdult?: boolean;
}

export interface AniListExternalLink {
  id?: number;
  site: string;
  url: string;
  type?: string;
  language?: string;
  color?: string;
  icon?: string;
  notes?: string;
  isDisabled?: boolean;
}

export interface AniListTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AniListNextAiringEpisode {
  id?: number;
  airingAt?: number;
  timeUntilAiring?: number;
  episode?: number;
  mediaId?: number;
}

export interface AniListMedia {
  id: number;
  idMal?: number;
  title: AniListMediaTitle;
  type: 'ANIME' | 'MANGA';
  format?: string;
  status?: string;
  description?: string;
  startDate?: AniListFuzzyDate;
  endDate?: AniListFuzzyDate;
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  chapters?: number;
  volumes?: number;
  countryOfOrigin?: string;
  isLicensed?: boolean;
  source?: string;
  coverImage?: AniListMediaCoverImage;
  bannerImage?: string;
  synonyms?: string[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  isLocked?: boolean;
  trending?: number;
  isAdult?: boolean;
  genres?: string[];
  tags?: AniListMediaTag[];
  externalLinks?: AniListExternalLink[];
  streamingEpisodes?: Array<{
    title?: string;
    thumbnail?: string;
    url?: string;
    site?: string;
  }>;
  siteUrl?: string;
  autoCreateForumThread?: boolean;
  isRecommendationBlocked?: boolean;
  isReviewBlocked?: boolean;
  modNotes?: string;
  updatedAt?: number;
  favourites?: number;
  trailer?: AniListTrailer;
  nextAiringEpisode?: AniListNextAiringEpisode;
  studios?: {
    edges?: AniListStudioEdge[];
  };
  staff?: {
    edges?: AniListStaffEdge[];
  };
  characters?: {
    edges?: AniListCharacterEdge[];
  };
  relations?: {
    edges?: AniListRelationEdge[];
  };
  recommendations?: {
    edges?: AniListRecommendationEdge[];
  };
  stats?: AniListMediaStats;
  rankings?: AniListRanking[];
  mediaListEntry?: AniListMediaListEntry | null;
  reviews?: AniListReviews;
  hashtag?: string;
  isFavourite?: boolean;
  isFavouriteBlocked?: boolean;
  isSaveBlocked?: boolean;
}

export interface AniListPageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

interface AniListPage {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

interface AniListGraphQLResponse {
  data?: AniListPage;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

interface AniListMediaResponse {
  data?: {
    Media?: AniListMedia;
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * AniList MediaList Entry Types
 * Based on AniList API MediaList object: https://docs.anilist.co/reference/object/media-list
 */
export interface AniListMediaListEntry {
  id: number;
  userId: number;
  mediaId: number;
  status?: string; // CURRENT, PLANNING, COMPLETED, DROPPED, PAUSED, REPEATING
  score?: number;
  progress?: number; // Episodes watched or chapters read
  progressVolumes?: number; // Volumes read (manga only)
  repeat?: number; // Number of times rewatched/reread
  priority?: number;
  private?: boolean;
  notes?: string;
  hiddenFromStatusLists?: boolean;
  customLists?: string[]; // JSON array of custom list names
  advancedScores?: Record<string, number>; // JSON object with advanced scores
  startedAt?: AniListFuzzyDate;
  completedAt?: AniListFuzzyDate;
  updatedAt?: number; // Unix timestamp
  createdAt?: number; // Unix timestamp
  media?: AniListMedia;
}

interface AniListMediaListPageData {
  Page: {
    pageInfo: AniListPageInfo;
    mediaList: AniListMediaListEntry[];
  };
}

interface AniListMediaListCollectionList {
  name: string;
  isCustomList: boolean;
  isSplitCompletedList: boolean;
  status?: string;
  entries: AniListMediaListEntry[];
}

interface AniListMediaListCollection {
  lists: AniListMediaListCollectionList[];
  hasNextChunk?: boolean;
  user?: {
    id: number;
    name: string;
    mediaListOptions?: {
      scoreFormat?: string;
      rowOrder?: string;
      animeList?: {
        sectionOrder?: string[];
        splitCompletedSectionByFormat?: boolean;
        customLists?: string[];
        advancedScoring?: string[];
        advancedScoringEnabled?: boolean;
      };
      mangaList?: {
        sectionOrder?: string[];
        splitCompletedSectionByFormat?: boolean;
        customLists?: string[];
        advancedScoring?: string[];
        advancedScoringEnabled?: boolean;
      };
    };
  };
}

interface AniListMediaListResponse {
  data?: {
    MediaList?: AniListMediaListEntry;
    MediaListCollection?: AniListMediaListCollection;
    Page?: AniListMediaListPageData['Page'];
    Media?: {
      id: number;
      title?: AniListMediaTitle;
      mediaListEntry?: AniListMediaListEntry | null;
    };
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

interface AniListTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface AniListOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  tokenUrl: string;
}

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

  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService?: CacheService,
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
   * GraphQL query to fetch media data from AniList
   */
  private getMediaQuery(): string {
    return `
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
  private async fetchMediaFromAniList(
    page: number = 1,
    perPage: number = this.PER_PAGE,
    type: 'ANIME' | 'MANGA' = 'ANIME',
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

      // HttpService returns { data: {...}, status: 200, ... }
      const responseData = response.data;

      // Handle GraphQL response structure
      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      if (!responseData.data || !responseData.data.Page) {
        throw new Error('No data returned from AniList API');
      }

      return responseData.data;
    } catch (error: unknown) {
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
   * Uses the same fields as getMediaQuery but for a single media item
   */
  private getMediaByIdQuery(): string {
    // Create a complete query for single Media by ID
    // This is the same structure as getMediaQuery but queries Media(id: $id) instead of Page
    return `
      query ($id: Int) {
        Media(id: $id) {
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
      }
    `;
  }

  /**
   * Fetch single media by ID from AniList API
   *
   * @param id - AniList media ID
   * @returns Promise with AniList media data or null if not found
   */
  async getMediaById(id: number): Promise<AniListMedia | null> {
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

      // HttpService returns { data: {...}, status: 200, ... }
      const responseData = response.data;

      // Handle GraphQL response structure
      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`AniList API errors: ${errorMessages}`);
      }

      if (!responseData.data || !responseData.data.Media) {
        return null;
      }

      return responseData.data.Media;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch media from AniList (id: ${id}): ${errorMessage}`,
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
   *
   * @param streamingEpisodes - Array of streaming episodes
   * @returns Object with site as key and episode data as value
   */
  private convertStreamingEpisodes(
    streamingEpisodes?: Array<{
      title?: string;
      thumbnail?: string;
      url?: string;
      site?: string;
    }>,
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
      myAnimeListId: anilistMedia.idMal?.toString(),
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
        coverImage: anilistMedia.coverImage,
        bannerImage: anilistMedia.bannerImage,
        genres: anilistMedia.genres,
        tags: anilistMedia.tags
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
        externalLinks: anilistMedia.externalLinks
          ? anilistMedia.externalLinks.map((link) => ({
              id: link.id,
              site: link.site,
              url: link.url,
              type: link.type,
              language: link.language,
              color: link.color,
              icon: link.icon,
              notes: link.notes,
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
        studios: anilistMedia.studios?.edges
          ? anilistMedia.studios.edges.map((edge) => ({
              id: edge.node.id,
              name: edge.node.name,
              isMain: edge.isMain,
              isAnimationStudio: edge.node.isAnimationStudio,
              siteUrl: edge.node.siteUrl,
              favourites: edge.node.favourites,
            }))
          : undefined,
        staff: anilistMedia.staff?.edges
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
        characters: anilistMedia.characters?.edges
          ? anilistMedia.characters.edges.map((edge) => ({
              id: edge.node.id,
              role: edge.role,
              name: edge.name,
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
              voiceActors: edge.voiceActors
                ? edge.voiceActors.map((va) => ({
                    id: va.id,
                    name: va.name,
                    language: va.language,
                    image: va.image,
                  }))
                : undefined,
            }))
          : undefined,
        relations: anilistMedia.relations?.edges
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
        recommendations: anilistMedia.recommendations?.edges
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
              scoreDistribution: anilistMedia.stats.scoreDistribution,
              statusDistribution: anilistMedia.stats.statusDistribution,
            }
          : undefined,
        rankings: anilistMedia.rankings
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
              nodes: anilistMedia.reviews.nodes
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
        hashtag: anilistMedia.hashtag,
        isFavourite: anilistMedia.isFavourite,
        isFavouriteBlocked: anilistMedia.isFavouriteBlocked,
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
   * Crawl media data from AniList for a specific type
   *
   * @param type - Media type to crawl (ANIME or MANGA)
   * @param maxPages - Maximum number of pages to crawl (0 = all pages)
   * @returns Promise with crawl statistics
   */
  async crawlAniListMedia(
    type: 'ANIME' | 'MANGA' = 'ANIME',
    maxPages: number = 0,
  ): Promise<{
    totalFetched: number;
    totalCreated: number;
    totalUpdated: number;
    errors: number;
  }> {
    this.logger.log(`Starting AniList crawl for type: ${type}`);

    let currentPage = 1;
    let hasNextPage = true;
    let totalFetched = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let errors = 0;

    try {
      while (hasNextPage && (maxPages === 0 || currentPage <= maxPages)) {
        this.logger.log(
          `Fetching page ${currentPage} of ${type} media from AniList...`,
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

        // Process each media item
        for (const media of mediaList) {
          try {
            const seriesData = this.mapAniListMediaToSeries(media);
            const existingSeries = await this.seriesRepository.findOne({
              where: { aniListId: seriesData.aniListId },
            });

            await this.saveOrUpdateSeries(seriesData);

            if (existingSeries) {
              totalUpdated++;
            } else {
              totalCreated++;
            }

            totalFetched++;
          } catch (error: unknown) {
            errors++;
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Failed to save media ${media.id}: ${errorMessage}`,
            );
          }
        }

        // Check if there are more pages
        hasNextPage = pageInfo.hasNextPage;
        currentPage++;

        // Add a small delay to avoid rate limiting
        if (hasNextPage) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      this.logger.log(
        `AniList crawl completed for ${type}. Fetched: ${totalFetched}, Created: ${totalCreated}, Updated: ${totalUpdated}, Errors: ${errors}`,
      );

      return {
        totalFetched,
        totalCreated,
        totalUpdated,
        errors,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AniList crawl failed for ${type}: ${errorMessage}`);
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
   * @param type - Media type to crawl
   * @param maxPages - Maximum number of pages to crawl
   * @returns Promise with crawl statistics
   */
  async manualCrawl(
    type: 'ANIME' | 'MANGA' = 'ANIME',
    maxPages: number = 1,
  ): Promise<{
    totalFetched: number;
    totalCreated: number;
    totalUpdated: number;
    errors: number;
  }> {
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
