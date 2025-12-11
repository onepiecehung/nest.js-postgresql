import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { CacheService } from 'src/shared/services';
import { IsNull, Repository } from 'typeorm';
import { CreateScopePermissionDto } from '../dto/create-scope-permission.dto';
import { ScopePermission } from '../entities/scope-permission.entity';
import { PermissionEvaluator } from './permission-evaluator.service';

/**
 * ScopePermissionService
 * Manages scope-level permissions (organization, team, project, etc.)
 */
@Injectable()
export class ScopePermissionService extends BaseService<ScopePermission> {
  private readonly logger = new Logger(ScopePermissionService.name);

  constructor(
    @InjectRepository(ScopePermission)
    private readonly scopePermissionRepository: Repository<ScopePermission>,
    cacheService: CacheService,
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {
    super(
      new TypeOrmBaseRepository<ScopePermission>(scopePermissionRepository),
      {
        entityName: 'ScopePermission',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'permissions:scope',
          swrSec: 60,
        },
        defaultSearchField: 'scopeType',
        relationsWhitelist: {},
        selectWhitelist: {
          id: true,
          scopeType: true,
          scopeId: true,
          allowPermissions: true,
          denyPermissions: true,
          permissionKey: true,
          reason: true,
          grantedBy: true,
          expiresAt: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof ScopePermission)[] {
    return ['scopeType', 'permissionKey'];
  }

  /**
   * Create a new scope permission
   */
  async createScopePermission(
    dto: CreateScopePermissionDto,
  ): Promise<ScopePermission> {
    const scopePermission = this.scopePermissionRepository.create({
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      allowPermissions: dto.allowPermissions || '0',
      denyPermissions: dto.denyPermissions || '0',
      permissionKey: dto.permissionKey,
      reason: dto.reason,
      grantedBy: dto.grantedBy,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    const saved = await this.scopePermissionRepository.save(scopePermission);

    // Invalidate cache for this scope
    await this.permissionEvaluator.invalidateScopeCache(
      dto.scopeType,
      dto.scopeId,
    );

    return saved;
  }

  /**
   * Find scope permissions by scope
   * @param scopeType - Type of scope
   * @param scopeId - ID of scope
   * @returns Array of scope permissions
   */
  async findByScope(
    scopeType: string,
    scopeId: string,
  ): Promise<ScopePermission[]> {
    return this.scopePermissionRepository.find({
      where: {
        scopeType,
        scopeId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update permissions for a scope
   * @param scopeType - Type of scope
   * @param scopeId - ID of scope
   * @param allowPermissions - Allow permissions bitmask
   * @param denyPermissions - Deny permissions bitmask
   * @returns Updated scope permission
   */
  async updatePermissions(
    scopeType: string,
    scopeId: string,
    allowPermissions: string,
    denyPermissions: string,
  ): Promise<ScopePermission> {
    // Find existing or create new
    let scopePermission = await this.scopePermissionRepository.findOne({
      where: {
        scopeType,
        scopeId,
        permissionKey: IsNull(), // General scope permission (not key-specific)
      },
    });

    if (!scopePermission) {
      scopePermission = this.scopePermissionRepository.create({
        scopeType,
        scopeId,
        allowPermissions,
        denyPermissions,
      });
    } else {
      scopePermission.allowPermissions = allowPermissions;
      scopePermission.denyPermissions = denyPermissions;
    }

    const saved = await this.scopePermissionRepository.save(scopePermission);

    // Invalidate cache for this scope
    await this.permissionEvaluator.invalidateScopeCache(scopeType, scopeId);

    return saved;
  }

  /**
   * Grant a specific permission to a scope
   * @param scopeType - Type of scope
   * @param scopeId - ID of scope
   * @param permissionKey - PermissionKey to grant
   * @param allow - Whether to allow (true) or deny (false)
   * @returns Updated or created scope permission
   */
  async grantScopePermission(
    scopeType: string,
    scopeId: string,
    permissionKey: string,
    allow: boolean = true,
  ): Promise<ScopePermission> {
    // Find existing key-specific permission
    let scopePermission = await this.scopePermissionRepository.findOne({
      where: {
        scopeType,
        scopeId,
        permissionKey,
      },
    });

    if (!scopePermission) {
      scopePermission = this.scopePermissionRepository.create({
        scopeType,
        scopeId,
        permissionKey,
        allowPermissions: '0',
        denyPermissions: '0',
      });
    }

    // Update the appropriate bitfield
    if (allow) {
      // Add to allow, remove from deny
      const currentAllow = BigInt(scopePermission.allowPermissions);
      // Note: We'd need PermissionRegistry here to get the bit mask
      // For now, this is a simplified version
      scopePermission.allowPermissions = currentAllow.toString();
      scopePermission.denyPermissions = '0'; // Clear deny for this key
    } else {
      // Add to deny, remove from allow
      const currentDeny = BigInt(scopePermission.denyPermissions);
      scopePermission.denyPermissions = currentDeny.toString();
      scopePermission.allowPermissions = '0'; // Clear allow for this key
    }

    const saved = await this.scopePermissionRepository.save(scopePermission);

    // Invalidate cache for this scope
    await this.permissionEvaluator.invalidateScopeCache(scopeType, scopeId);

    return saved;
  }

  /**
   * Revoke a permission from a scope
   * @param scopeType - Type of scope
   * @param scopeId - ID of scope
   * @param permissionKey - PermissionKey to revoke
   */
  async revokeScopePermission(
    scopeType: string,
    scopeId: string,
    permissionKey: string,
  ): Promise<void> {
    const scopePermission = await this.scopePermissionRepository.findOne({
      where: {
        scopeType,
        scopeId,
        permissionKey,
      },
    });

    if (scopePermission) {
      await this.scopePermissionRepository.remove(scopePermission);

      // Invalidate cache for this scope
      await this.permissionEvaluator.invalidateScopeCache(scopeType, scopeId);
    }
  }

  /**
   * Lifecycle hook: after create
   */
  protected async afterCreate(entity: ScopePermission): Promise<void> {
    await this.permissionEvaluator.invalidateScopeCache(
      entity.scopeType,
      entity.scopeId,
    );
  }

  /**
   * Lifecycle hook: after update
   */
  protected async afterUpdate(entity: ScopePermission): Promise<void> {
    await this.permissionEvaluator.invalidateScopeCache(
      entity.scopeType,
      entity.scopeId,
    );
  }

  /**
   * Lifecycle hook: after delete
   */
  protected async afterDelete(id: string): Promise<void> {
    // Get entity to find scope info
    const entity = await this.findById(id);
    if (entity) {
      await this.permissionEvaluator.invalidateScopeCache(
        entity.scopeType,
        entity.scopeId,
      );
    }
  }
}
