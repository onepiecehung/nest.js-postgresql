import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/permissions/entities/role.entity';
import { ScopePermission } from 'src/permissions/entities/scope-permission.entity';
import { UserPermission } from 'src/permissions/entities/user-permission.entity';
import { UserRole } from 'src/permissions/entities/user-role.entity';
import { EffectivePermissions } from 'src/permissions/interfaces/effective-permissions.interface';
import {
  EvaluationContext,
  EvaluationResult,
} from 'src/permissions/interfaces/evaluation-context.interface';
import { PermissionRegistry } from 'src/permissions/services/permission-registry.service';
import { PermissionKey } from 'src/permissions/types/permission-key.type';
import {
  aggregateAllowBitfields,
  aggregateDenyBitfields,
  checkPermissionStatus,
  evaluatePermissionWithPrecedence,
} from 'src/permissions/utils/evaluation.util';
import { CacheService } from 'src/shared/services';
import { In, IsNull, Repository } from 'typeorm';

/**
 * Cached effective permissions structure
 * Used for type safety when parsing cached data
 */
interface CachedEffectivePermissions {
  allowPermissions: string;
  denyPermissions: string;
  permissions: Record<string, boolean>;
  permissionDetails: Record<string, 'allow' | 'deny' | 'undefined'>;
}

/**
 * PermissionEvaluator service
 * Implements permission evaluation with precedence logic:
 * Scope → Role → User (scope has highest priority, user lowest)
 * Deny always overrides allow at each level
 */
@Injectable()
export class PermissionEvaluator {
  private readonly logger = new Logger(PermissionEvaluator.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'permissions:effective';

  constructor(
    @InjectRepository(ScopePermission)
    private readonly scopePermissionRepository: Repository<ScopePermission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    private readonly permissionRegistry: PermissionRegistry,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Evaluate if a user has a specific permission
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns true if user has permission, false otherwise
   */
  async evaluate(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string,
  ): Promise<boolean> {
    const result = await this.evaluateWithDetails(
      userId,
      permissionKey,
      scopeType,
      scopeId,
    );
    return result.allowed;
  }

  /**
   * Evaluate permission with detailed result
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns EvaluationResult with details
   */
  async evaluateWithDetails(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string,
  ): Promise<EvaluationResult> {
    // Get bit index for permission key
    const bitIndex = this.permissionRegistry.getBitIndex(permissionKey);
    if (bitIndex === null) {
      this.logger.warn(`PermissionKey ${permissionKey} not found in registry`);
      return {
        allowed: false,
        level: 'default',
        denied: false,
        reason: `PermissionKey ${permissionKey} not registered`,
      };
    }

    // Load all permission sources
    const context: EvaluationContext = { userId, scopeType, scopeId };
    const { scopeAllow, scopeDeny, roleAllow, roleDeny, userAllow, userDeny } =
      await this.loadPermissionSources(context);

    // Evaluate with precedence
    const evaluation = evaluatePermissionWithPrecedence(
      scopeAllow,
      scopeDeny,
      roleAllow,
      roleDeny,
      userAllow,
      userDeny,
      bitIndex,
    );

    return {
      allowed: evaluation.allowed,
      level: evaluation.level,
      denied: !evaluation.allowed && evaluation.level !== 'default',
      reason: `Permission ${permissionKey} ${evaluation.allowed ? 'allowed' : 'denied'} at ${evaluation.level} level`,
    };
  }

  /**
   * Get effective permissions for a user in a scope
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns EffectivePermissions with all permissions
   */
  async getEffectivePermissions(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): Promise<EffectivePermissions> {
    const cacheKey = this.getCacheKey(userId, scopeType, scopeId);

    // Try cache first
    const cached = await this.cacheService?.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached as string) as CachedEffectivePermissions;
      return {
        allowPermissions: BigInt(parsed.allowPermissions),
        denyPermissions: BigInt(parsed.denyPermissions),
        permissions: parsed.permissions,
        permissionDetails: parsed.permissionDetails,
      };
    }

    // Load permission sources
    const context: EvaluationContext = { userId, scopeType, scopeId };
    const { scopeAllow, scopeDeny, roleAllow, roleDeny, userAllow, userDeny } =
      await this.loadPermissionSources(context);

    // Combine all levels with precedence
    // Final allow = scope allow OR (role allow AND NOT scope deny) OR (user allow AND NOT role deny AND NOT scope deny)
    // Final deny = scope deny OR role deny OR user deny
    const finalAllow = this.combineAllowPermissions(
      scopeAllow,
      scopeDeny,
      roleAllow,
      roleDeny,
      userAllow,
      userDeny,
    );
    const finalDeny = scopeDeny | roleDeny | userDeny;

    // Build permission maps
    const allPermissionKeys = this.permissionRegistry.getAllPermissionKeys();
    const permissions: Record<string, boolean> = {};
    const permissionDetails: Record<string, 'allow' | 'deny' | 'undefined'> =
      {};

    for (const key of allPermissionKeys) {
      const bitIndex = this.permissionRegistry.getBitIndex(key);
      if (bitIndex === null) continue;

      const status = checkPermissionStatus(finalAllow, finalDeny, bitIndex);
      permissionDetails[key] = status;
      permissions[key] = status === 'allow';
    }

    const result: EffectivePermissions = {
      allowPermissions: finalAllow,
      denyPermissions: finalDeny,
      permissions,
      permissionDetails,
    };

    // Cache result
    await this.cacheService?.set(
      cacheKey,
      JSON.stringify({
        allowPermissions: finalAllow.toString(),
        denyPermissions: finalDeny.toString(),
        permissions,
        permissionDetails,
      }),
      this.CACHE_TTL,
    );

    return result;
  }

  /**
   * Load all permission sources for evaluation
   * @param context - Evaluation context
   * @returns Aggregated permission bitfields
   */
  private async loadPermissionSources(context: EvaluationContext): Promise<{
    scopeAllow: bigint;
    scopeDeny: bigint;
    roleAllow: bigint;
    roleDeny: bigint;
    userAllow: bigint;
    userDeny: bigint;
  }> {
    // 1. Load scope permissions
    let scopeAllow = 0n;
    let scopeDeny = 0n;
    if (context.scopeType && context.scopeId) {
      const scopePermissions = await this.scopePermissionRepository.find({
        where: {
          scopeType: context.scopeType,
          scopeId: context.scopeId,
        },
      });

      const validScopePermissions = scopePermissions.filter((sp) =>
        sp.isValid(),
      );
      scopeAllow = aggregateAllowBitfields(
        validScopePermissions.map((sp) => sp.getAllowPermissionsAsBigInt()),
      );
      scopeDeny = aggregateDenyBitfields(
        validScopePermissions.map((sp) => sp.getDenyPermissionsAsBigInt()),
      );
    }

    // 2. Load user roles (global + scoped)
    const userRoles = await this.userRoleRepository.find({
      where: {
        userId: context.userId,
      },
      relations: ['role'],
    });

    const validUserRoles = userRoles.filter((ur) => ur.isValid());
    const roleIds = validUserRoles.map((ur) => ur.roleId);

    // Get global roles and scoped roles
    // Query global roles (where scopeType and scopeId are null)
    const globalRoles: Role[] =
      roleIds.length > 0
        ? await this.roleRepository.find({
            where: {
              id: In(roleIds),
              scopeType: IsNull(),
              scopeId: IsNull(),
            },
          })
        : [];

    // Query scoped roles if context has scope
    const scopedRoles: Role[] =
      context.scopeType && context.scopeId && roleIds.length > 0
        ? await this.roleRepository.find({
            where: {
              id: In(roleIds),
              scopeType: context.scopeType,
              scopeId: context.scopeId,
            },
          })
        : [];

    // Combine global and scoped roles
    const roles: Role[] = [...globalRoles, ...scopedRoles];

    // Aggregate role permissions
    const roleAllowBitfields: bigint[] = [];
    const roleDenyBitfields: bigint[] = [];

    for (const role of roles) {
      // Use allowPermissions and denyPermissions fields
      if (
        role.allowPermissions !== null &&
        role.allowPermissions !== undefined
      ) {
        roleAllowBitfields.push(role.getAllowPermissionsAsBigInt());
      }

      if (role.denyPermissions !== null && role.denyPermissions !== undefined) {
        roleDenyBitfields.push(role.getDenyPermissionsAsBigInt());
      }
    }

    const roleAllow = aggregateAllowBitfields(roleAllowBitfields);
    const roleDeny = aggregateDenyBitfields(roleDenyBitfields);

    // 3. Load user permissions (global + scoped)
    const userPermissions: UserPermission[] =
      await this.userPermissionRepository.find({
        where: {
          userId: context.userId,
        },
      });

    const validUserPermissions: UserPermission[] = userPermissions.filter(
      (up) => up.isValid(),
    );
    const globalUserPermissions = validUserPermissions.filter(
      (up) => !up.contextType && !up.contextId,
    );
    const scopedUserPermissions =
      context.scopeType && context.scopeId
        ? validUserPermissions.filter(
            (up) =>
              up.contextType === context.scopeType &&
              up.contextId === context.scopeId,
          )
        : [];

    // Aggregate user permissions
    const userAllowBitfields: bigint[] = [];
    const userDenyBitfields: bigint[] = [];

    for (const up of [...globalUserPermissions, ...scopedUserPermissions]) {
      // Use allowPermissions and denyPermissions fields
      if (up.allowPermissions !== null && up.allowPermissions !== undefined) {
        userAllowBitfields.push(up.getAllowPermissionsAsBigInt());
      }

      if (up.denyPermissions !== null && up.denyPermissions !== undefined) {
        userDenyBitfields.push(up.getDenyPermissionsAsBigInt());
      }
    }

    const userAllow = aggregateAllowBitfields(userAllowBitfields);
    const userDeny = aggregateDenyBitfields(userDenyBitfields);

    return {
      scopeAllow,
      scopeDeny,
      roleAllow,
      roleDeny,
      userAllow,
      userDeny,
    };
  }

  /**
   * Combine allow permissions with precedence logic
   * @param scopeAllow - Scope allow bitfield
   * @param scopeDeny - Scope deny bitfield
   * @param roleAllow - Role allow bitfield
   * @param roleDeny - Role deny bitfield
   * @param userAllow - User allow bitfield
   * @param userDeny - User deny bitfield
   * @returns Final allow bitfield
   */
  private combineAllowPermissions(
    scopeAllow: bigint,
    scopeDeny: bigint,
    roleAllow: bigint,
    roleDeny: bigint,
    userAllow: bigint,
    userDeny: bigint,
  ): bigint {
    // Scope allow takes precedence (if not denied by scope)
    const scopeEffective = scopeAllow & ~scopeDeny;

    // Role allow (if not denied by scope or role)
    const roleEffective = roleAllow & ~scopeDeny & ~roleDeny;

    // User allow (if not denied by scope, role, or user)
    const userEffective = userAllow & ~scopeDeny & ~roleDeny & ~userDeny;

    // Combine: scope OR role OR user
    return scopeEffective | roleEffective | userEffective;
  }

  /**
   * Invalidate cache for a user's effective permissions
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   */
  async invalidateCache(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, scopeType, scopeId);
    await this.cacheService?.delete(cacheKey);
  }

  /**
   * Invalidate all caches for a user
   * @param userId - User ID
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:${userId}:*`;
    await this.cacheService?.deleteKeysByPattern(pattern);
  }

  /**
   * Invalidate all caches for a scope
   * @param scopeType - Scope type
   * @param scopeId - Scope ID
   */
  async invalidateScopeCache(
    scopeType: string,
    scopeId: string,
  ): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:*:${scopeType}:${scopeId}`;
    await this.cacheService?.deleteKeysByPattern(pattern);
  }

  /**
   * Get cache key for effective permissions
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns Cache key string
   */
  private getCacheKey(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): string {
    if (scopeType && scopeId) {
      return `${this.CACHE_PREFIX}:${userId}:${scopeType}:${scopeId}`;
    }
    return `${this.CACHE_PREFIX}:${userId}:global`;
  }
}
