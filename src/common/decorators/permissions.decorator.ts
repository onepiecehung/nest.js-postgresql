import { SetMetadata } from '@nestjs/common';
import { PermissionName } from 'src/shared/constants';
import { ContextConfig } from 'src/permissions/interfaces/context-resolver.interface';

/**
 * Permission check options for complex logic
 */
export interface PermissionCheckOptions {
  /** Must have ALL of these permissions (AND operation) */
  all?: PermissionName[];
  /** Must have ANY of these permissions (OR operation) */
  any?: PermissionName[];
  /** Must have NONE of these permissions (NOT operation) */
  none?: PermissionName[];
  /** Organization context (optional, deprecated - use contexts instead) */
  organizationId?: string;
  /** Context configurations for resource-specific permission checks */
  contexts?: ContextConfig[];
  /** Auto-detect context from request (default: false) */
  autoDetectContext?: boolean;
}

/**
 * Metadata key for permission requirements
 */
export const REQUIRE_PERMISSIONS_METADATA = 'requirePermissions';

/**
 * Decorator to require specific permissions for route access
 * Supports complex AND/OR/NOT logic
 *
 * @example
 * // Simple permission check
 * @RequirePermissions({ all: ['ARTICLE_CREATE'] })
 *
 * // Complex logic: must have ARTICLE_CREATE AND (ARTICLE_EDIT_OWN OR ARTICLE_EDIT_ALL) AND NOT ADMINISTRATOR
 * @RequirePermissions({
 *   all: ['ARTICLE_CREATE'],
 *   any: ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL'],
 *   none: ['ADMINISTRATOR']
 * })
 *
 * // With organization context
 * @RequirePermissions({
 *   all: ['ORGANIZATION_MANAGE_MEMBERS'],
 *   organizationId: 'org-123'
 * })
 */
export const Permissions = (options: PermissionCheckOptions) =>
  SetMetadata(REQUIRE_PERMISSIONS_METADATA, options);
