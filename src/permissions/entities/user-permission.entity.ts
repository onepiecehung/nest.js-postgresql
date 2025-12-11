import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * UserPermission entity representing specific permissions granted to users
 * This allows for more granular permission control beyond just roles
 */
@Entity({ name: 'user_permissions' })
@Index(['userId', 'permission'], { unique: true })
@Index(['userId'])
export class UserPermission extends BaseEntityCustom {
  /**
   * ID of the user this permission is granted to
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  userId: string;

  /**
   * The user entity this permission belongs to
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Permission name/key (e.g., 'SEND_MESSAGES', 'MANAGE_CHANNELS')
   */
  @Column({ type: 'varchar', length: 100 })
  permission: string;

  // Use allowPermissions and denyPermissions for permission bitfields

  /**
   * Allow permissions bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this user permission allows
   */
  @Column({ type: 'bigint', nullable: true, default: null })
  allowPermissions?: string;

  /**
   * Deny permissions bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this user permission explicitly denies
   */
  @Column({ type: 'bigint', nullable: true, default: null })
  denyPermissions?: string;

  /**
   * Optional context for the permission (e.g., channel ID, organization ID)
   */
  @Column({ type: 'bigint', nullable: true })
  contextId?: string;

  /**
   * Type of context (e.g., 'channel', 'organization')
   */
  @Column({ type: 'varchar', nullable: true })
  contextType?: string;

  /**
   * Optional reason for granting this permission
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

  // Use getAllowPermissionsAsBigInt() and setAllowPermissionsFromBigInt() for allow permissions
  // Use getDenyPermissionsAsBigInt() and setDenyPermissionsFromBigInt() for deny permissions

  /**
   * Get allow permissions as BigInt for bitwise operations
   */
  getAllowPermissionsAsBigInt(): bigint {
    return this.allowPermissions ? BigInt(this.allowPermissions) : 0n;
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
    return this.denyPermissions ? BigInt(this.denyPermissions) : 0n;
  }

  /**
   * Set deny permissions from BigInt value
   */
  setDenyPermissionsFromBigInt(permissions: bigint): void {
    this.denyPermissions = permissions.toString();
  }

  /**
   * Check if this permission has expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if this permission is still valid
   */
  isValid(): boolean {
    return !this.isDeleted() && !this.isExpired();
  }
}
