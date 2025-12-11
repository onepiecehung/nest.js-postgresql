import { SetMetadata } from '@nestjs/common';
import { ContextConfig } from 'src/permissions/interfaces/context-resolver.interface';
import { PermissionKey } from 'src/permissions/types/permission-key.type';

/**
 * Permission check options for complex logic
 * Uses PermissionKeys format
 */
export interface PermissionCheckOptions {
  /** Must have ALL of these PermissionKeys (AND operation) */
  all?: PermissionKey[];
  /** Must have ANY of these PermissionKeys (OR operation) */
  any?: PermissionKey[];
  /** Must have NONE of these PermissionKeys (NOT operation) */
  none?: PermissionKey[];
  /** Scope type (e.g., 'organization', 'team', 'project') */
  scopeType?: string;
  /** Scope ID */
  scopeId?: string;
  /** Auto-detect scope from request (default: false) */
  autoDetectScope?: boolean;
  /** Context configurations for resource-specific permission checks (legacy support) */
  contexts?: ContextConfig[];
  /** Auto-detect context from request (default: false) (legacy support) */
  autoDetectContext?: boolean;
  /** @deprecated Use scopeType='organization' and scopeId instead */
  organizationId?: string;
}

/**
 * Metadata key for permission requirements
 */
export const REQUIRE_PERMISSIONS_METADATA = 'requirePermissions';

/**
 * Decorator to require specific permissions for route access
 * Supports complex AND/OR/NOT logic using PermissionKeys
 *
 * @example
 * // Simple permission check
 * @RequirePermissions({ all: ['article.create'] })
 *
 * // Complex logic
 * @RequirePermissions({
 *   all: ['article.create'],
 *   any: ['article.update', 'article.delete'],
 *   none: ['article.delete']
 * })
 *
 * // With scope context
 * @RequirePermissions({
 *   all: ['organization.update'],
 *   scopeType: 'organization',
 *   autoDetectScope: true
 * })
 */
export const Permissions = (options: PermissionCheckOptions) =>
  SetMetadata(REQUIRE_PERMISSIONS_METADATA, options);
