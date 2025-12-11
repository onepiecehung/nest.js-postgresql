import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

/**
 * ScopePermission entity representing permissions attached to a scope
 * (e.g., organization, team, project)
 * Supports both allow and deny permissions via separate bitfields
 */
@Entity({ name: 'scope_permissions' })
@Index(['scopeType', 'scopeId'])
@Index(['scopeType', 'scopeId', 'permissionKey'], {
  unique: true,
  where: 'permission_key IS NOT NULL',
})
export class ScopePermission extends BaseEntityCustom {
  /**
   * Type of scope (e.g., 'organization', 'team', 'project')
   */
  @Column({ type: 'varchar', length: 50 })
  scopeType: string;

  /**
   * ID of the scope resource
   */
  @Column({ type: 'bigint' })
  scopeId: string;

  /**
   * Allow permissions bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this scope allows
   */
  @Column({ type: 'bigint', default: '0' })
  allowPermissions: string;

  /**
   * Deny permissions bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this scope explicitly denies
   */
  @Column({ type: 'bigint', default: '0' })
  denyPermissions: string;

  /**
   * Optional PermissionKey for single permission grants
   * If set, this record represents a single permission grant/deny
   */
  @Column({
    name: 'permission_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  permissionKey?: string;

  /**
   * Optional reason for this scope permission
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * ID of the user who granted this permission
   */
  @Column({ type: 'bigint', nullable: true })
  grantedBy?: string;

  /**
   * When this permission expires (optional)
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  /**
   * Get allow permissions as BigInt for bitwise operations
   */
  getAllowPermissionsAsBigInt(): bigint {
    return BigInt(this.allowPermissions);
  }

  /**
   * Set allow permissions from BigInt value
   */
  setAllowPermissionsFromBigInt(permissions: bigint): void {
    this.allowPermissions = permissions.toString();
  }

  /**
   * Get deny permissions as BigInt for bitwise operations
   */
  getDenyPermissionsAsBigInt(): bigint {
    return BigInt(this.denyPermissions);
  }

  /**
   * Set deny permissions from BigInt value
   */
  setDenyPermissionsFromBigInt(permissions: bigint): void {
    this.denyPermissions = permissions.toString();
  }

  /**
   * Check if this scope permission has expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if this scope permission is still valid
   */
  isValid(): boolean {
    return !this.isDeleted() && !this.isExpired();
  }
}
