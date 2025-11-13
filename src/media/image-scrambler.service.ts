import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, hkdfSync, randomBytes } from 'crypto';

// Use TypeScript import = require syntax for CommonJS module compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sharp = require('sharp');

/**
 * Metadata structure for image scrambler stored in media.metadata
 */
export interface ImageScrambleMetadata {
  enabled: boolean;
  version: number;
  salt: string; // base64 encoded salt
  tileRows: number;
  tileCols: number;
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
    const scramblerConfig = this.configService.get('app.imageScrambler') as {
      enabled: boolean;
      masterKey: string;
      tileRows: number;
      tileCols: number;
      version: number;
    };

    this.logger.log('scramblerConfig', scramblerConfig);

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
    config: {
      masterKey: string;
      tileRows: number;
      tileCols: number;
      version: number;
    },
  ): Promise<ScrambleResult> {
    // Read image metadata using sharp
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const sharpInstance = sharp(buffer, { failOnError: false });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const metadata = await sharpInstance.metadata();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const width = metadata.width;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const croppedImageBuffer = await sharpInstance
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .extract({
        left: 0,
        top: 0,
        width: scrambledWidth,
        height: scrambledHeight,
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .toBuffer();

    // Create a new sharp instance from the cropped image
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const croppedSharp = sharp(croppedImageBuffer);

    // Generate per-image salt and derive key using HKDF
    const salt = randomBytes(16);
    const masterKey = Buffer.from(config.masterKey, 'utf-8');
    const imageKey = Buffer.from(
      hkdfSync('sha256', masterKey, salt, 'jai-image-scramble-v1', 32),
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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const tileBuffer = await croppedSharp
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .clone()
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .extract({
            left,
            top,
            width: tileWidth,
            height: tileHeight,
          })
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .toBuffer();

        tiles.push(tileBuffer as Buffer);
      }
    }

    // Create scrambled canvas by placing tiles according to permutation
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const scrambledBuffer = await base
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .composite(composites)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .toFormat('png')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      buffer: scrambledBuffer as Buffer,
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
   * Create a seeded PRNG function from a buffer seed
   * Uses Mulberry32-like algorithm for deterministic randomness
   * @param seed Seed buffer (uses first 4 bytes)
   * @returns RNG function that returns values in [0, 1)
   */
  private createRngFromSeed(seed: Buffer): () => number {
    let x = seed.readUInt32BE(0) ^ 0x6d2b79f5; // XOR with constant to avoid trivial patterns

    return function () {
      x |= 0;
      x = (x + 0x6d2b79f5) | 0;
      let t = Math.imul(x ^ (x >>> 15), 1 | x);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
