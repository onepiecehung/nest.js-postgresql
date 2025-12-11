import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ALL_PERMISSION_KEYS } from '../constants/permission-keys.constants';
import { PermissionKey } from '../types/permission-key.type';

/**
 * PermissionRegistry service
 * Builds and maintains the mapping of PermissionKey → bit index
 * Initialized at module bootstrap
 */
@Injectable()
export class PermissionRegistry implements OnModuleInit {
  private readonly logger = new Logger(PermissionRegistry.name);

  /**
   * Map of PermissionKey to bit index
   * Bit index is the position in the bitfield (0-based)
   */
  private readonly keyToBitIndex: Map<PermissionKey, number> = new Map();

  /**
   * Reverse map: bit index to PermissionKey
   */
  private readonly bitIndexToKey: Map<number, PermissionKey> = new Map();

  /**
   * Initialize registry on module init
   * Registers all PermissionKeys and assigns bit indices sequentially
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing PermissionRegistry...');

    // Register all PermissionKeys sequentially
    ALL_PERMISSION_KEYS.forEach((key, index) => {
      this.registerPermissionKey(key, index);
    });

    this.logger.log(
      `PermissionRegistry initialized with ${this.keyToBitIndex.size} permissions`,
    );
  }

  /**
   * Register a PermissionKey with a specific bit index
   * @param key - PermissionKey to register
   * @param bitIndex - Bit index (0-based)
   * @throws Error if key is already registered or bit index is already used
   */
  private registerPermissionKey(key: PermissionKey, bitIndex: number): void {
    // Check for duplicate keys
    if (this.keyToBitIndex.has(key)) {
      throw new Error(
        `PermissionKey ${key} is already registered at bit index ${this.keyToBitIndex.get(key)}`,
      );
    }

    // Check for duplicate bit indices
    if (this.bitIndexToKey.has(bitIndex)) {
      throw new Error(
        `Bit index ${bitIndex} is already used by PermissionKey ${this.bitIndexToKey.get(bitIndex)}`,
      );
    }

    this.keyToBitIndex.set(key, bitIndex);
    this.bitIndexToKey.set(bitIndex, key);

    this.logger.debug(
      `Registered PermissionKey ${key} at bit index ${bitIndex}`,
    );
  }

  /**
   * Get bit index for a PermissionKey
   * @param key - PermissionKey to look up
   * @returns Bit index or null if not found
   */
  getBitIndex(key: PermissionKey): number | null {
    return this.keyToBitIndex.get(key) ?? null;
  }

  /**
   * Get PermissionKey for a bit index
   * @param bitIndex - Bit index to look up
   * @returns PermissionKey or null if not found
   */
  getPermissionKey(bitIndex: number): PermissionKey | null {
    return this.bitIndexToKey.get(bitIndex) ?? null;
  }

  /**
   * Get bit mask for a PermissionKey
   * @param key - PermissionKey to get bit mask for
   * @returns BigInt bit mask (1n << bitIndex) or 0n if not found
   */
  getBitMask(key: PermissionKey): bigint {
    const bitIndex = this.getBitIndex(key);
    if (bitIndex === null) {
      return 0n;
    }
    return 1n << BigInt(bitIndex);
  }

  /**
   * Get bit masks for multiple PermissionKeys
   * @param keys - Array of PermissionKeys
   * @returns Combined bit mask (OR of all keys)
   */
  getBitMasks(keys: PermissionKey[]): bigint {
    return keys.reduce((acc, key) => acc | this.getBitMask(key), 0n);
  }

  /**
   * Check if a PermissionKey is registered
   * @param key - PermissionKey to check
   * @returns true if registered, false otherwise
   */
  isRegistered(key: PermissionKey): boolean {
    return this.keyToBitIndex.has(key);
  }

  /**
   * Get all registered PermissionKeys
   * @returns Array of all registered PermissionKeys
   */
  getAllPermissionKeys(): PermissionKey[] {
    return Array.from(this.keyToBitIndex.keys());
  }

  /**
   * Get total number of registered permissions
   * @returns Number of registered permissions
   */
  getPermissionCount(): number {
    return this.keyToBitIndex.size;
  }

  /**
   * Get the maximum bit index used
   * @returns Maximum bit index or -1 if no permissions registered
   */
  getMaxBitIndex(): number {
    if (this.bitIndexToKey.size === 0) {
      return -1;
    }
    return Math.max(...Array.from(this.bitIndexToKey.keys()));
  }
}
