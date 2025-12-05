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

  /**
   * Permission bitmask stored as string for safe BigInt handling
   * Contains bitwise permissions that this role grants
   */
  @Column({ type: 'bigint', default: '0' })
  permissions: string;

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

  /**
   * Get permissions as BigInt for bitwise operations
   */
  getPermissionsAsBigInt(): bigint {
    return BigInt(this.permissions);
  }

  /**
   * Set permissions from BigInt value
   */
  setPermissionsFromBigInt(permissions: bigint): void {
    this.permissions = permissions.toString();
  }

  /**
   * Check if this role has a specific permission
   */
  hasPermission(permission: bigint): boolean {
    return (this.getPermissionsAsBigInt() & permission) !== 0n;
  }

  /**
   * Check if this role is the everyone role
   */
  isEveryoneRole(): boolean {
    return this.name.toLowerCase() === 'everyone';
  }

  /**
   * Check if this role has administrator permissions
   * Checks for ARTICLE_MANAGE_ALL permission as admin indicator
   */
  isAdmin(): boolean {
    // Use ARTICLE_MANAGE_ALL as admin indicator (bit position 6)
    return this.hasPermission(1n << 6n); // ARTICLE_MANAGE_ALL permission
  }
}
