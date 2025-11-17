/**
 * AniList GraphQL API Response Types
 * All TypeScript interfaces for AniList API responses
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

export interface AniListStreamingEpisode {
  title?: string;
  thumbnail?: string;
  url?: string;
  site?: string;
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
  streamingEpisodes?: AniListStreamingEpisode[];
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

export interface AniListPage {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

export interface AniListGraphQLResponse {
  data?: AniListPage;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface AniListMediaResponse {
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

export interface AniListMediaListPageData {
  Page: {
    pageInfo: AniListPageInfo;
    mediaList: AniListMediaListEntry[];
  };
}

export interface AniListMediaListCollectionList {
  name: string;
  isCustomList: boolean;
  isSplitCompletedList: boolean;
  status?: string;
  entries: AniListMediaListEntry[];
}

export interface AniListMediaListCollection {
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

export interface AniListMediaListResponse {
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

export interface AniListTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface AniListOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  tokenUrl: string;
}
