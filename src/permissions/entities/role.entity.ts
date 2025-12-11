import { Organization } from 'src/organizations/entities/organization.entity';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { UserRole } from './user-role.entity';

/**
 * Role entity representing Discord-style roles with permission bitfields
 * Each role has a position for hierarchy and permissions as BigInt bitmask
 */
@Entity({ name: 'roles' })
@Index(['name'], { unique: true })
export class Role extends BaseEntityCustom {
  /**
   * Unique name of the role
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  /**
   * Optional description of the role's purpose
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  // Use allowPermissions and denyPermissions for permission bitfields

  /**
   * Allow permissions bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this role allows
   */
  @Column({ type: 'bigint', nullable: true, default: null })
  allowPermissions?: string;

  /**
   * Deny permissions bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this role explicitly denies
   */
  @Column({ type: 'bigint', nullable: true, default: null })
  denyPermissions?: string;

  /**
   * Type of scope this role applies to (e.g., 'organization', 'team', 'project')
   * If null, role is global
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  scopeType?: string;

  /**
   * ID of the scope resource this role applies to
   * If null, role is global
   */
  @Column({ type: 'bigint', nullable: true })
  scopeId?: string;

  /**
   * Position of the role in the hierarchy (higher = more permissions)
   * Used for role precedence in permission calculations
   */
  @Column({ type: 'int', default: 0 })
  position: number;

  /**
   * Color for the role (hex format, optional)
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color?: string;

  /**
   * Whether this role is mentionable by users
   */
  @Column({ type: 'boolean', default: false })
  mentionable: boolean;

  /**
   * Whether this role is managed by an external service (like integrations)
   */
  @Column({ type: 'boolean', default: false })
  managed: boolean;

  /**
   * Icon URL for the role (optional)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  icon?: string;

  /**
   * Unicode emoji for the role (optional)
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  unicodeEmoji?: string;

  /**
   * Tags associated with this role (stored as JSON)
   */
  @Column('jsonb', { nullable: true })
  tags?: Record<string, unknown>;

  /**
   * User roles that reference this role
   */
  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];

  /**
   * Organization this role belongs to (optional, for organization-specific roles)
   */
  @ManyToOne(() => Organization, (organization) => organization.roles, {
    nullable: true,
  })
  organization?: Organization;

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
   * Check if this role is scoped (has scopeType and scopeId)
   */
  isScoped(): boolean {
    return !!this.scopeType && !!this.scopeId;
  }

  /**
   * Check if this role is global (no scope)
   */
  isGlobal(): boolean {
    return !this.scopeType && !this.scopeId;
  }

  /**
   * Check if this role is the everyone role
   */
  isEveryoneRole(): boolean {
    return this.name.toLowerCase() === 'everyone';
  }

  /**
   * Check if this role has administrator permissions
   * Checks if role has all permissions (allowPermissions is max value)
   */
  isAdmin(): boolean {
    // Check if role has all permissions (max bigint value)
    const maxPermissions = ~0n; // All bits set
    return this.allowPermissions
      ? BigInt(this.allowPermissions) === maxPermissions
      : false;
  }
}
