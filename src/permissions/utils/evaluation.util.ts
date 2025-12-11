/**
 * Utility functions for permission evaluation
 */

/**
 * Check if a specific bit is set in a bitfield
 * @param bitfield - Bitfield to check
 * @param bitIndex - Bit index to check (0-based)
 * @returns true if bit is set, false otherwise
 */
export function isBitSet(bitfield: bigint, bitIndex: number): boolean {
  const mask = 1n << BigInt(bitIndex);
  return (bitfield & mask) !== 0n;
}

/**
 * Set a specific bit in a bitfield
 * @param bitfield - Bitfield to modify
 * @param bitIndex - Bit index to set (0-based)
 * @returns New bitfield with bit set
 */
export function setBit(bitfield: bigint, bitIndex: number): bigint {
  const mask = 1n << BigInt(bitIndex);
  return bitfield | mask;
}

/**
 * Clear a specific bit in a bitfield
 * @param bitfield - Bitfield to modify
 * @param bitIndex - Bit index to clear (0-based)
 * @returns New bitfield with bit cleared
 */
export function clearBit(bitfield: bigint, bitIndex: number): bigint {
  const mask = 1n << BigInt(bitIndex);
  return bitfield & ~mask;
}

/**
 * Aggregate multiple allow bitfields using OR operation
 * @param bitfields - Array of allow bitfields
 * @returns Combined allow bitfield
 */
export function aggregateAllowBitfields(bitfields: bigint[]): bigint {
  return bitfields.reduce((acc, bf) => acc | bf, 0n);
}

/**
 * Aggregate multiple deny bitfields using OR operation
 * @param bitfields - Array of deny bitfields
 * @returns Combined deny bitfield
 */
export function aggregateDenyBitfields(bitfields: bigint[]): bigint {
  return bitfields.reduce((acc, bf) => acc | bf, 0n);
}

/**
 * Check if a permission is allowed given allow and deny bitfields
 * @param allowBitfield - Allow bitfield
 * @param denyBitfield - Deny bitfield
 * @param bitIndex - Bit index to check (0-based)
 * @returns 'allow' if allowed, 'deny' if denied, 'undefined' if neither
 */
export function checkPermissionStatus(
  allowBitfield: bigint,
  denyBitfield: bigint,
  bitIndex: number,
): 'allow' | 'deny' | 'undefined' {
  const mask = 1n << BigInt(bitIndex);

  // Deny takes precedence
  if ((denyBitfield & mask) !== 0n) {
    return 'deny';
  }

  // Check if allowed
  if ((allowBitfield & mask) !== 0n) {
    return 'allow';
  }

  // Neither allow nor deny
  return 'undefined';
}

/**
 * Evaluate permission with precedence: deny > allow > undefined
 * @param scopeAllow - Scope allow bitfield
 * @param scopeDeny - Scope deny bitfield
 * @param roleAllow - Role allow bitfield (aggregated)
 * @param roleDeny - Role deny bitfield (aggregated)
 * @param userAllow - User allow bitfield
 * @param userDeny - User deny bitfield
 * @param bitIndex - Bit index to check (0-based)
 * @returns Evaluation result
 */
export function evaluatePermissionWithPrecedence(
  scopeAllow: bigint,
  scopeDeny: bigint,
  roleAllow: bigint,
  roleDeny: bigint,
  userAllow: bigint,
  userDeny: bigint,
  bitIndex: number,
): { allowed: boolean; level: 'scope' | 'role' | 'user' | 'default' } {
  const mask = 1n << BigInt(bitIndex);

  // 1. Check scope level (highest priority)
  const scopeStatus = checkPermissionStatus(scopeAllow, scopeDeny, bitIndex);
  if (scopeStatus === 'deny') {
    return { allowed: false, level: 'scope' };
  }
  if (scopeStatus === 'allow') {
    return { allowed: true, level: 'scope' };
  }

  // 2. Check role level
  const roleStatus = checkPermissionStatus(roleAllow, roleDeny, bitIndex);
  if (roleStatus === 'deny') {
    return { allowed: false, level: 'role' };
  }
  if (roleStatus === 'allow') {
    return { allowed: true, level: 'role' };
  }

  // 3. Check user level
  const userStatus = checkPermissionStatus(userAllow, userDeny, bitIndex);
  if (userStatus === 'deny') {
    return { allowed: false, level: 'user' };
  }
  if (userStatus === 'allow') {
    return { allowed: true, level: 'user' };
  }

  // 4. Default deny
  return { allowed: false, level: 'default' };
}
