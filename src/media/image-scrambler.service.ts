import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, hkdfSync, randomBytes } from 'crypto';

// Use TypeScript import = require syntax for CommonJS module compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sharp = require('sharp');

/**
 * Base interface for common image scrambler fields
 * Contains fields shared between config and metadata
 */
export interface ImageScramblerBase {
  enabled: boolean;
  version: number;
  tileRows: number;
  tileCols: number;
}

/**
 * Configuration structure for image scrambler from app config
 * This interface represents the complete scrambler configuration
 * Extends base interface with server-side configuration fields
 */
export interface ImageScramblerConfig extends ImageScramblerBase {
  masterKey: string;
  contextString: string;
  rotationDurationSeconds?: number;
}

/**
 * Metadata structure for image scrambler stored in media.metadata
 * Extends base interface with per-image metadata fields
 */
export interface ImageScrambleMetadata extends ImageScramblerBase {
  salt: string; // base64 encoded salt (unique per image)
}

/**
 * Result of image scrambling operation
 */
export interface ScrambleResult {
  buffer: Buffer; // scrambled image buffer
  width: number;
  height: number;
  metadata: ImageScrambleMetadata;
}

/**
 * Service for scrambling images into tiles using deterministic permutation
 * derived from HKDF master key
 */
@Injectable()
export class ImageScramblerService {
  private readonly logger = new Logger(ImageScramblerService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Scramble image if scrambler is enabled and file is an image
   * @param buffer Original image buffer
   * @param mimeType MIME type of the file
   * @returns ScrambleResult if scrambling was performed, null otherwise
   */
  async scrambleIfNeeded(
    buffer: Buffer,
    mimeType: string,
  ): Promise<ScrambleResult | null> {
    // Get scrambler configuration
    const scramblerConfig =
      this.configService.get<ImageScramblerConfig>('app.imageScrambler');

    // Return null if scrambler is disabled
    if (!scramblerConfig?.enabled) {
      return null;
    }

    // Return null if file is not an image
    if (!mimeType || !mimeType.startsWith('image/')) {
      return null;
    }

    try {
      return await this.scrambleImage(buffer, scramblerConfig);
    } catch (error) {
      this.logger.error('Failed to scramble image:', error);
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_SCRAMBLE_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Scramble an image into tiles using deterministic permutation
   * @param buffer Original image buffer
   * @param config Scrambler configuration
   * @returns ScrambleResult with scrambled buffer and metadata
   */
  private async scrambleImage(
    buffer: Buffer,
    config: ImageScramblerConfig,
  ): Promise<ScrambleResult> {
    // Read image metadata using sharp

    const sharpInstance = sharp(buffer, { failOnError: false });

    const metadata = await sharpInstance.metadata();

    const width = metadata.width;

    const height = metadata.height;

    // Validate image dimensions
    if (!width || !height || width === 0 || height === 0) {
      throw new HttpException(
        {
          messageKey: 'media.INVALID_IMAGE_DIMENSIONS',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const tileRows = config.tileRows;
    const tileCols = config.tileCols;

    // Calculate tile dimensions
    const tileWidth = Math.floor(width / tileCols);
    const tileHeight = Math.floor(height / tileRows);

    // Use effective canvas size (crop remainder to ensure perfect tile division)
    const scrambledWidth = tileWidth * tileCols;
    const scrambledHeight = tileHeight * tileRows;

    // Validate that we have valid tile dimensions
    if (tileWidth <= 0 || tileHeight <= 0) {
      throw new HttpException(
        {
          messageKey: 'media.INVALID_TILE_DIMENSIONS',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // First, crop the image to the effective canvas size to ensure clean tile extraction

    const croppedImageBuffer = await sharpInstance

      .extract({
        left: 0,
        top: 0,
        width: scrambledWidth,
        height: scrambledHeight,
      })

      .toBuffer();

    // Create a new sharp instance from the cropped image

    const croppedSharp = sharp(croppedImageBuffer);

    // Generate per-image salt and derive key using HKDF
    // Context string is configurable via environment variable
    const salt = randomBytes(16);
    const masterKey = Buffer.from(config.masterKey, 'utf-8');
    const contextString = config.contextString;
    const imageKey = Buffer.from(
      hkdfSync('sha256', masterKey, salt, contextString, 32),
    );

    // Generate permutation seed from image key
    const permSeed = createHmac('sha256', imageKey)
      .update('perm-seed')
      .digest();

    // Create deterministic permutation using seeded RNG
    const numTiles = tileRows * tileCols;
    const permutation = this.generatePermutation(permSeed, numTiles);

    // Extract original tiles from the cropped image
    const tiles: Buffer[] = [];
    for (let row = 0; row < tileRows; row++) {
      for (let col = 0; col < tileCols; col++) {
        const left = col * tileWidth;
        const top = row * tileHeight;

        const tileBuffer = await croppedSharp

          .clone()

          .extract({
            left,
            top,
            width: tileWidth,
            height: tileHeight,
          })

          .toBuffer();

        tiles.push(tileBuffer);
      }
    }

    // Create scrambled canvas by placing tiles according to permutation

    const base = sharp({
      create: {
        width: scrambledWidth,
        height: scrambledHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    // Build composite array: originalIndex -> destIndex = permutation[originalIndex]
    const composites = permutation.map((destIndex, originalIndex) => {
      const srcTileBuffer = tiles[originalIndex];
      const destRow = Math.floor(destIndex / tileCols);
      const destCol = destIndex % tileCols;

      return {
        input: srcTileBuffer,
        top: destRow * tileHeight,
        left: destCol * tileWidth,
      };
    });

    // Composite tiles onto base canvas and convert to buffer

    const scrambledBuffer = await base

      .composite(composites)

      .toFormat('png')

      .toBuffer();

    // Build scramble metadata
    const scrambleMetadata: ImageScrambleMetadata = {
      enabled: true,
      version: config.version,
      salt: salt.toString('base64'),
      tileRows,
      tileCols,
    };

    return {
      buffer: scrambledBuffer,
      width: scrambledWidth,
      height: scrambledHeight,
      metadata: scrambleMetadata,
    };
  }

  /**
   * Generate deterministic permutation using seeded RNG (Fisher-Yates shuffle)
   * @param seed Seed buffer for RNG
   * @param length Length of permutation array
   * @returns Permutation array where permutation[i] is the destination index for original index i
   */
  private generatePermutation(seed: Buffer, length: number): number[] {
    // Initialize array with sequential indices
    const permutation = Array.from({ length }, (_, i) => i);

    // Create seeded RNG
    const rng = this.createRngFromSeed(seed);

    // Fisher-Yates shuffle
    for (let i = length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }

    return permutation;
  }

  /**
   * Create a seeded PRNG (Pseudo-Random Number Generator) function from a buffer seed
   *
   * This function implements a Mulberry32-like algorithm to generate deterministic
   * random numbers. The key property is: same seed → same sequence of random numbers.
   * This is crucial for image scrambling because we need to generate the same
   * permutation when scrambling and unscrambling the same image.
   *
   * How it works:
   * 1. Takes first 4 bytes from seed buffer as initial state (32-bit unsigned integer)
   * 2. Each call to the returned function generates the next random number
   * 3. Uses bitwise operations and integer multiplication for fast, deterministic randomness
   * 4. Returns values in range [0, 1) suitable for random selection
   *
   * Why Mulberry32?
   * - Fast: Uses only bitwise operations and integer math
   * - Good quality: Passes statistical randomness tests
   * - Deterministic: Same seed always produces same sequence
   * - 32-bit: Works well with JavaScript's number system
   *
   * @param seed Seed buffer (uses first 4 bytes as Big-Endian 32-bit unsigned integer)
   * @returns RNG function that returns values in [0, 1) when called
   *
   * @example
   * const rng = createRngFromSeed(Buffer.from([0x12, 0x34, 0x56, 0x78]));
   * const random1 = rng(); // e.g., 0.123456789
   * const random2 = rng(); // e.g., 0.987654321 (different but deterministic)
   */
  private createRngFromSeed(seed: Buffer): () => number {
    // Initialize state: Read first 4 bytes as Big-Endian 32-bit unsigned integer
    // XOR with magic constant 0x6d2b79f5 to avoid trivial patterns when seed is 0 or small
    // This ensures even simple seeds produce good randomness
    let x = seed.readUInt32BE(0) ^ 0x6d2b79f5;

    // Return a closure that maintains state 'x' and generates random numbers
    return function () {
      // Ensure x is treated as 32-bit signed integer (remove any float parts)
      // This is important for bitwise operations to work correctly
      x |= 0;

      // Step 1: Linear congruential update (LCG-like step)
      // Add magic constant and ensure 32-bit integer overflow behavior
      // The | 0 forces 32-bit signed integer arithmetic (wraps on overflow)
      x = (x + 0x6d2b79f5) | 0;

      // Step 2: First mixing stage (non-linear transformation)
      // XOR x with its right-shifted version (mixes high and low bits)
      // Math.imul ensures 32-bit integer multiplication (important for overflow behavior)
      // (1 | x) ensures we always multiply by an odd number (better mixing)
      let t = Math.imul(x ^ (x >>> 15), 1 | x);

      // Step 3: Second mixing stage (additional non-linear transformation)
      // Apply another round of mixing with different shift amounts (7 and 14)
      // The constants 61 and the final XOR add more non-linearity
      // This creates better distribution of random bits
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

      // Step 4: Final transformation and normalization to [0, 1)
      // XOR with right-shift by 14 bits (final bit mixing)
      // >>> 0 converts to unsigned 32-bit integer (handles negative numbers)
      // Divide by 2^32 (4294967296) to get float in range [0, 1)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
