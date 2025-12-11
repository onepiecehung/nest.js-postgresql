import { PermissionKey } from '../types/permission-key.type';

/**
 * All PermissionKey constants for the system
 * Organized by component for easy reference
 */

// Article permissions
export const ARTICLE_CREATE: PermissionKey = 'article.create';
export const ARTICLE_READ: PermissionKey = 'article.read';
export const ARTICLE_UPDATE: PermissionKey = 'article.update';
export const ARTICLE_DELETE: PermissionKey = 'article.delete';

// Series permissions
export const SERIES_CREATE: PermissionKey = 'series.create';
export const SERIES_READ: PermissionKey = 'series.read';
export const SERIES_UPDATE: PermissionKey = 'series.update';
export const SERIES_DELETE: PermissionKey = 'series.delete';

// Segment permissions
export const SEGMENT_CREATE: PermissionKey = 'segment.create';
export const SEGMENT_READ: PermissionKey = 'segment.read';
export const SEGMENT_UPDATE: PermissionKey = 'segment.update';
export const SEGMENT_DELETE: PermissionKey = 'segment.delete';

// Organization permissions
export const ORGANIZATION_CREATE: PermissionKey = 'organization.create';
export const ORGANIZATION_READ: PermissionKey = 'organization.read';
export const ORGANIZATION_UPDATE: PermissionKey = 'organization.update';
export const ORGANIZATION_DELETE: PermissionKey = 'organization.delete';

// Team permissions
export const TEAM_CREATE: PermissionKey = 'team.create';
export const TEAM_READ: PermissionKey = 'team.read';
export const TEAM_UPDATE: PermissionKey = 'team.update';
export const TEAM_DELETE: PermissionKey = 'team.delete';

// Project permissions
export const PROJECT_CREATE: PermissionKey = 'project.create';
export const PROJECT_READ: PermissionKey = 'project.read';
export const PROJECT_UPDATE: PermissionKey = 'project.update';
export const PROJECT_DELETE: PermissionKey = 'project.delete';

// Media permissions
export const MEDIA_CREATE: PermissionKey = 'media.create';
export const MEDIA_READ: PermissionKey = 'media.read';
export const MEDIA_UPDATE: PermissionKey = 'media.update';
export const MEDIA_DELETE: PermissionKey = 'media.delete';

// Sticker permissions
export const STICKER_CREATE: PermissionKey = 'sticker.create';
export const STICKER_READ: PermissionKey = 'sticker.read';
export const STICKER_UPDATE: PermissionKey = 'sticker.update';
export const STICKER_DELETE: PermissionKey = 'sticker.delete';

// Report permissions
export const REPORT_CREATE: PermissionKey = 'report.create';
export const REPORT_READ: PermissionKey = 'report.read';
export const REPORT_UPDATE: PermissionKey = 'report.update';
export const REPORT_DELETE: PermissionKey = 'report.delete';

/**
 * All PermissionKeys as an array
 */
export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  // Article
  ARTICLE_CREATE,
  ARTICLE_READ,
  ARTICLE_UPDATE,
  ARTICLE_DELETE,
  // Series
  SERIES_CREATE,
  SERIES_READ,
  SERIES_UPDATE,
  SERIES_DELETE,
  // Segment
  SEGMENT_CREATE,
  SEGMENT_READ,
  SEGMENT_UPDATE,
  SEGMENT_DELETE,
  // Organization
  ORGANIZATION_CREATE,
  ORGANIZATION_READ,
  ORGANIZATION_UPDATE,
  ORGANIZATION_DELETE,
  // Team
  TEAM_CREATE,
  TEAM_READ,
  TEAM_UPDATE,
  TEAM_DELETE,
  // Project
  PROJECT_CREATE,
  PROJECT_READ,
  PROJECT_UPDATE,
  PROJECT_DELETE,
  // Media
  MEDIA_CREATE,
  MEDIA_READ,
  MEDIA_UPDATE,
  MEDIA_DELETE,
  // Sticker
  STICKER_CREATE,
  STICKER_READ,
  STICKER_UPDATE,
  STICKER_DELETE,
  // Report
  REPORT_CREATE,
  REPORT_READ,
  REPORT_UPDATE,
  REPORT_DELETE,
];
