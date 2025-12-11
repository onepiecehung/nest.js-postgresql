/**
 * Effective permissions result
 * Contains both allow and deny bitfields
 */
export interface EffectivePermissions {
  /**
   * Combined allow permissions bitfield
   */
  allowPermissions: bigint;

  /**
   * Combined deny permissions bitfield
   */
  denyPermissions: bigint;

  /**
   * Boolean map of individual permissions for easy checking
   * Key: PermissionKey, Value: boolean (true if allowed, false if denied or not allowed)
   */
  permissions: Record<string, boolean>;

  /**
   * Detailed permission map showing allow/deny status
   * Key: PermissionKey, Value: 'allow' | 'deny' | 'undefined'
   */
  permissionDetails: Record<string, 'allow' | 'deny' | 'undefined'>;
}
