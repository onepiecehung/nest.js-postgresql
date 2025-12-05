import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  PermissionCheckOptions,
  REQUIRE_PERMISSIONS_METADATA,
} from 'src/common/decorators/permissions.decorator';
import { AuthPayload } from 'src/common/interface';
import { PermissionName } from 'src/shared/constants';
import { PermissionsService } from 'src/permissions/permissions.service';
import { ContextResolverService } from 'src/permissions/services/context-resolver.service';
import { UserPermissionService } from 'src/permissions/services/user-permission.service';
import { USER_CONSTANTS, UserRole } from 'src/shared/constants';

/**
 * High-performance permission guard using Redis cache
 * Only loads permissions on login, then serves from cache
 *
 * Features:
 * - Cached permission checks for optimal performance
 * - Support for organization-scoped permissions
 * - Admin role bypass for super users
 * - Comprehensive error handling and logging
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  // Admin roles that bypass permission checks
  private readonly ADMIN_ROLES: UserRole[] = [
    USER_CONSTANTS.ROLES.ADMIN,
    USER_CONSTANTS.ROLES.SUPER_ADMIN,
  ];

  constructor(
    private readonly reflector: Reflector,
    private readonly userPermissionService: UserPermissionService,
    private readonly permissionsService: PermissionsService,
    private readonly contextResolverService: ContextResolverService,
  ) {}

  /**
   * Check if user has admin role that bypasses permission checks
   * @param user - User authentication payload
   * @returns true if user has admin role, false otherwise
   */
  private isAdminUser(user: AuthPayload): boolean {
    return user.role ? this.ADMIN_ROLES.includes(user.role) : false;
  }

  /**
   * Extract organizationId from request params, body, or query
   * @param request - Express request object
   * @returns organizationId if found, undefined otherwise
   */
  private extractOrganizationIdFromRequest(
    request: Request,
  ): string | undefined {
    // Priority order: URL params > request body > query params

    // 1. Check URL parameters first (most common case)
    const params = request.params as Record<string, string>;
    if (params.organizationId) {
      return params.organizationId;
    }

    // Check if URL path suggests organization context
    if (params.id && this.isOrganizationContext(request.url)) {
      return params.id;
    }

    // 2. Check request body for organization context
    const body = request.body as Record<string, unknown>;
    if (body && typeof body === 'object') {
      // Direct organizationId field
      if (this.isValidString(body.organizationId)) {
        return body.organizationId;
      }

      // Nested organization object
      if (body.organization && typeof body.organization === 'object') {
        const org = body.organization as Record<string, unknown>;
        if (this.isValidString(org.id)) {
          return org.id;
        }
      }
    }

    // 3. Check query parameters (least common)
    const query = request.query as Record<string, string>;
    if (this.isValidString(query.organizationId)) {
      return query.organizationId;
    }

    return undefined;
  }

  /**
   * Check if URL path suggests organization context
   * @param url - Request URL
   * @returns true if URL suggests organization context
   */
  private isOrganizationContext(url: string): boolean {
    return url.includes('/organizations/') || url.includes('/org/');
  }

  /**
   * Validate if value is a non-empty string
   * @param value - Value to validate
   * @returns true if value is a valid non-empty string
   */
  private isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validate user authentication and extract user from request
   * @param request - Express request with user payload
   * @returns validated user payload
   * @throws UnauthorizedException if user is not authenticated
   */
  private validateUser(request: Request & { user: AuthPayload }): AuthPayload {
    const user = request.user;

    // Check if user exists and has required properties
    if (!user || !user.uid || !this.isValidAuthPayload(user)) {
      const userId = user?.uid || 'unknown';
      const userRole = user?.role || 'unknown';
      const hasUser = !!user;
      const hasUid = !!user?.uid;
      const hasSsid = !!user?.ssid;

      if (!hasUser || !hasUid) {
        this.logger.warn('No user found in request for permission check', {
          hasUser,
          userId,
          url: request.url,
          method: request.method,
        });
      } else {
        this.logger.error('Invalid user payload structure', {
          userId,
          hasUid,
          hasSsid,
          userRole,
        });
      }

      throw new UnauthorizedException({
        messageKey: 'auth.UNAUTHORIZED',
        details: {
          userId,
          message:
            hasUser && hasUid
              ? 'Invalid user authentication payload'
              : 'User authentication required for permission check',
        },
      });
    }

    return user;
  }

  /**
   * Type guard to validate AuthPayload structure
   * @param user - User object to validate
   * @returns true if user has valid AuthPayload structure
   */
  private isValidAuthPayload(user: unknown): user is AuthPayload {
    if (typeof user !== 'object' || user === null) {
      return false;
    }

    const userObj = user as Record<string, unknown>;
    return (
      'uid' in userObj &&
      'ssid' in userObj &&
      typeof userObj.uid === 'string' &&
      typeof userObj.ssid === 'string' &&
      userObj.uid.trim().length > 0 &&
      userObj.ssid.trim().length > 0
    );
  }

  /**
   * Get all required permissions from options (all + any)
   * @param options - Permission check options
   * @returns Array of all required permission names
   */
  private getAllRequiredPermissions(
    options: PermissionCheckOptions,
  ): PermissionName[] {
    const permissions: PermissionName[] = [];
    if (options.all) {
      permissions.push(...options.all);
    }
    if (options.any) {
      permissions.push(...options.any);
    }
    return permissions;
  }

  /**
   * Get required permissions for a specific context type
   * @param options - Permission check options
   * @param contextType - Context type to get permissions for
   * @returns Array of permission names required for this context
   */
  private getRequiredPermissionsForContext(
    options: PermissionCheckOptions,
    contextType: string,
  ): PermissionName[] {
    // For now, return all required permissions
    // In the future, we can add context-specific permission mapping
    return this.getAllRequiredPermissions(options);
  }

  /**
   * Handle permission check errors with proper logging and error formatting
   * @param error - The error that occurred
   * @param user - User making the request
   * @param permissionOptions - Required permissions
   * @throws ForbiddenException with formatted error details
   */
  private handlePermissionError(
    error: unknown,
    user: AuthPayload,
    permissionOptions: PermissionCheckOptions,
  ): never {
    if (
      error instanceof ForbiddenException ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }

    this.logger.error('Permission check failed for user', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.uid,
      userRole: user.role,
      requiredPermissions: permissionOptions,
    });

    throw new ForbiddenException({
      messageKey: 'auth.FORBIDDEN',
      details: {
        userId: user.uid,
        message: 'Permission check failed due to system error',
      },
    });
  }

  /**
   * Main guard method that checks if user has required permissions
   * @param context - Execution context containing request information
   * @returns Promise<boolean> - true if access is allowed, false otherwise
   * @throws UnauthorizedException if user is not authenticated
   * @throws ForbiddenException if user lacks required permissions
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from decorator
    const permissionOptions = this.reflector.get<PermissionCheckOptions>(
      REQUIRE_PERMISSIONS_METADATA,
      context.getHandler(),
    );

    // If no permissions required, allow access
    if (!permissionOptions) {
      return true;
    }

    // Get and validate user from request
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthPayload }>();
    const user = this.validateUser(request);

    // Admin users bypass all permission checks
    if (this.isAdminUser(user)) {
      this.logger.debug('Admin user bypassed permission check', {
        userId: user.uid,
        userRole: user.role,
        requiredPermissions: permissionOptions,
      });
      return true;
    }

    try {
      // 1. Check general permissions first (without context)
      const hasGeneralPermissions =
        await this.userPermissionService.checkPermissions(user.uid, {
          all: permissionOptions.all,
          any: permissionOptions.any,
          none: permissionOptions.none,
        });

      // If general permissions pass and no context required, allow access
      if (
        hasGeneralPermissions &&
        !permissionOptions.contexts &&
        !permissionOptions.autoDetectContext
      ) {
        // Backward compatibility: check organizationId if provided
        let organizationId = permissionOptions.organizationId;
        if (!organizationId) {
          organizationId = this.extractOrganizationIdFromRequest(request);
        }

        if (organizationId) {
          // Re-check with organization context
          const hasOrgPermissions =
            await this.userPermissionService.checkPermissions(
              user.uid,
              {
                all: permissionOptions.all,
                any: permissionOptions.any,
                none: permissionOptions.none,
              },
              organizationId,
            );

          if (!hasOrgPermissions) {
            throw new ForbiddenException({
              messageKey: 'auth.FORBIDDEN',
              details: {
                userId: user.uid,
                requiredPermissions: permissionOptions,
                message: 'Insufficient permissions for this organization',
              },
            });
          }
        }

        this.logger.debug('Permission check passed (general)', {
          userId: user.uid,
          userRole: user.role,
          organizationId,
          requiredPermissions: permissionOptions,
        });

        return true;
      }

      // 2. Check context-specific permissions if contexts are configured
      if (permissionOptions.contexts && permissionOptions.contexts.length > 0) {
        const contexts = await this.contextResolverService.extractContexts(
          request,
          permissionOptions.contexts,
        );

        // Check if all required contexts were found
        const requiredContexts = permissionOptions.contexts.filter(
          (c) => c.required,
        );
        for (const config of requiredContexts) {
          if (!contexts.has(config.type)) {
            throw new ForbiddenException({
              messageKey: 'auth.FORBIDDEN',
              details: {
                userId: user.uid,
                message: `Required context ${config.type} not found in request`,
              },
            });
          }
        }

        // Check permissions for each context
        const permissionChecks: Promise<boolean>[] = [];

        for (const [contextType, context] of contexts.entries()) {
          // Get required permissions for this context
          const requiredPerms = this.getRequiredPermissionsForContext(
            permissionOptions,
            contextType,
          );

          if (requiredPerms.length === 0) {
            continue; // No specific permissions required for this context
          }

          // Check if user has any of the required permissions for this context
          const checkPromise = this.permissionsService.hasAnyContextPermission(
            user.uid,
            requiredPerms,
            context.type,
            context.id,
          );

          permissionChecks.push(checkPromise);
        }

        // If no context-specific checks needed, fall back to general check
        if (permissionChecks.length === 0) {
          if (!hasGeneralPermissions) {
            throw new ForbiddenException({
              messageKey: 'auth.FORBIDDEN',
              details: {
                userId: user.uid,
                requiredPermissions: permissionOptions,
                message: 'Insufficient permissions',
              },
            });
          }
          return true;
        }

        // All context checks must pass
        const contextResults = await Promise.all(permissionChecks);
        const allContextChecksPassed = contextResults.every(
          (result) => result === true,
        );

        if (!allContextChecksPassed) {
          throw new ForbiddenException({
            messageKey: 'auth.FORBIDDEN',
            details: {
              userId: user.uid,
              requiredPermissions: permissionOptions,
              contexts: Array.from(contexts.values()),
              message: 'Insufficient permissions for resource context',
            },
          });
        }

        this.logger.debug('Permission check passed (context-specific)', {
          userId: user.uid,
          contexts: Array.from(contexts.values()),
          requiredPermissions: permissionOptions,
        });

        return true;
      }

      // 3. Auto-detect context if enabled
      if (permissionOptions.autoDetectContext) {
        const detectedContext =
          await this.contextResolverService.autoDetectContext(request);

        if (detectedContext) {
          // Get required permissions
          const requiredPerms =
            this.getAllRequiredPermissions(permissionOptions);

          if (requiredPerms.length > 0) {
            const hasContextPermission =
              await this.permissionsService.hasAnyContextPermission(
                user.uid,
                requiredPerms,
                detectedContext.type,
                detectedContext.id,
              );

            if (!hasContextPermission) {
              throw new ForbiddenException({
                messageKey: 'auth.FORBIDDEN',
                details: {
                  userId: user.uid,
                  context: detectedContext,
                  requiredPermissions: permissionOptions,
                  message: 'Insufficient permissions for detected context',
                },
              });
            }

            this.logger.debug(
              'Permission check passed (auto-detected context)',
              {
                userId: user.uid,
                context: detectedContext,
                requiredPermissions: permissionOptions,
              },
            );

            return true;
          }
        }
      }

      // 4. Fall back to general permission check
      if (!hasGeneralPermissions) {
        throw new ForbiddenException({
          messageKey: 'auth.FORBIDDEN',
          details: {
            userId: user.uid,
            requiredPermissions: permissionOptions,
            message: 'Insufficient permissions for this operation',
          },
        });
      }

      this.logger.debug('Permission check passed (general)', {
        userId: user.uid,
        userRole: user.role,
        requiredPermissions: permissionOptions,
      });

      return true;
    } catch (error) {
      this.handlePermissionError(error, user, permissionOptions);
    }
  }
}
