import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAccessTokenGuard } from 'src/auth/guard/jwt-access-token.guard';
import { PermissionsGuard } from 'src/auth/guard/permissions.guard';
import { PermissionCheckOptions, Permissions } from './permissions.decorator';

/**
 * Decorator to require specific permissions for route access
 * Automatically includes JwtAccessTokenGuard to ensure authentication happens before permission checks
 *
 * @example
 * // Simple permission check (authentication is automatic)
 * @RequirePermissions({ all: ['article.create'] })
 *
 * // With scope context
 * @RequirePermissions({
 *   all: ['organization.update'],
 *   scopeType: 'organization',
 *   autoDetectScope: true
 * })
 */
export function RequirePermissions(options: PermissionCheckOptions) {
  return applyDecorators(
    Permissions(options),
    // JwtAccessTokenGuard must run first to set request.user
    // PermissionsGuard runs second to check permissions
    UseGuards(JwtAccessTokenGuard, PermissionsGuard),
  );
}
