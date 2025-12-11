import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/auth/guard/permissions.guard';
import {
  PermissionCheckOptions,
  REQUIRE_PERMISSIONS_METADATA,
} from 'src/common/decorators/permissions.decorator';

/**
 * Permission decorator
 * Uses PermissionKey format (e.g., "article.create", "series.read")
 *
 * @example
 * // Simple permission check
 * @RequirePermission({ all: ['article.create'] })
 *
 * // Complex logic
 * @RequirePermission({
 *   all: ['article.create'],
 *   any: ['article.update', 'article.delete'],
 *   none: ['article.delete']
 * })
 */
export function RequirePermission(options: PermissionCheckOptions) {
  return applyDecorators(
    SetMetadata(REQUIRE_PERMISSIONS_METADATA, options),
    UseGuards(PermissionsGuard),
  );
}
