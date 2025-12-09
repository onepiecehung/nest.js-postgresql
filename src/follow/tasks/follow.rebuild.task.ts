import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { UserFollowBitset } from '../entities/user-follow-bitset.entity';
import { UserFollowEdge } from '../entities/user-follow-edge.entity';
import { FollowBitsetService } from '../follow-bitset.service';
import { FollowCacheService } from '../follow-cache.service';

/**
 * FollowRebuildTask - Background task for rebuilding bitsets
 *
 * Runs periodically to rebuild bitsets from edge data and maintain consistency
 */
@Injectable()
export class FollowRebuildTask {
  private readonly logger = new Logger(FollowRebuildTask.name);
  private readonly BATCH_SIZE = 100;
  private readonly MAX_CONCURRENT = 5;

  constructor(
    @InjectRepository(UserFollowBitset)
    private readonly bitsetRepo: Repository<UserFollowBitset>,
    @InjectRepository(UserFollowEdge)
    private readonly edgeRepo: Repository<UserFollowEdge>,
    private readonly followBitsetService: FollowBitsetService,
    private readonly cacheService: FollowCacheService,
  ) {}

  /**
   * Rebuild bitsets for users that need it
   * Runs every 5 minutes
   */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async rebuildBitsets(): Promise<void> {
    try {
      this.logger.log('🔄 Starting bitset rebuild task');

      // Get users that need rebuild
      const usersToRebuild = await this.getUsersNeedingRebuild();

      if (usersToRebuild.length === 0) {
        this.logger.debug('No users need bitset rebuild');
        return;
      }

      this.logger.log(`Found ${usersToRebuild.length} users needing rebuild`);

      // Process in batches
      const batches = this.chunkArray(usersToRebuild, this.BATCH_SIZE);
      let processedCount = 0;

      for (const batch of batches) {
        await this.processBatch(batch);
        processedCount += batch.length;

        this.logger.debug(
          `Processed ${processedCount}/${usersToRebuild.length} users`,
        );
      }

      this.logger.log(
        `✅ Bitset rebuild task completed. Processed ${processedCount} users`,
      );
    } catch (error) {
      this.logger.error('❌ Bitset rebuild task failed:', error);
    }
  }

  /**
   * Rebuild bitsets for specific users
   * @param userIds Array of user IDs to rebuild
   */
  async rebuildUserBitsets(
    userIds: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.followBitsetService.rebuildFromEdges(userId, true);
        success++;
        this.logger.debug(`Rebuilt bitset for user ${userId}`);
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to rebuild bitset for user ${userId}:`,
          error,
        );
      }
    }

    return { success, failed };
  }

  /**
   * Clean up old edge records
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldEdges(): Promise<void> {
    try {
      this.logger.log('🧹 Starting edge cleanup task');

      // Delete soft-deleted edges older than 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const result = await this.edgeRepo.delete({
        status: 'deleted',
        deletedAt: LessThan(cutoffDate),
      });

      this.logger.log(`✅ Cleaned up ${result.affected || 0} old edge records`);
    } catch (error) {
      this.logger.error('❌ Edge cleanup task failed:', error);
    }
  }

  /**
   * Validate bitset consistency
   * Runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async validateConsistency(): Promise<void> {
    try {
      this.logger.log('🔍 Starting consistency validation task');

      // Get a sample of users to validate
      const sampleUsers = await this.bitsetRepo
        .createQueryBuilder('bitset')
        .orderBy('RANDOM()')
        .limit(100)
        .getMany();

      let inconsistentCount = 0;

      for (const bitset of sampleUsers) {
        try {
          const isConsistent = await this.validateUserBitset(bitset.userId);
          if (!isConsistent) {
            inconsistentCount++;
            this.logger.warn(
              `Inconsistent bitset found for user ${bitset.userId}`,
            );

            // Trigger rebuild
            await this.followBitsetService.rebuildFromEdges(
              bitset.userId,
              true,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to validate bitset for user ${bitset.userId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `✅ Consistency validation completed. Found ${inconsistentCount} inconsistent bitsets`,
      );
    } catch (error) {
      this.logger.error('❌ Consistency validation task failed:', error);
    }
  }

  /**
   * Get users that need bitset rebuild
   * @returns Array of user IDs
   */
  private async getUsersNeedingRebuild(): Promise<string[]> {
    try {
      // Get users with bitsets that need rebuild
      const bitsets = await this.bitsetRepo
        .createQueryBuilder('bitset')
        .where(
          'bitset.lastRebuildAt IS NULL OR bitset.lastRebuildAt < :cutoff',
          {
            cutoff: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        )
        .orWhere('bitset.version < :currentVersion', {
          currentVersion: 1,
        })
        .select(['bitset.userId'])
        .limit(1000)
        .getMany();

      return bitsets.map((bitset) => bitset.userId);
    } catch (error) {
      this.logger.error('Failed to get users needing rebuild:', error);
      return [];
    }
  }

  /**
   * Process a batch of users
   * @param userIds Array of user IDs
   */
  private async processBatch(userIds: string[]): Promise<void> {
    const promises = userIds.map((userId) =>
      this.rebuildUserBitset(userId).catch((error) => {
        this.logger.error(
          `Failed to rebuild bitset for user ${userId}:`,
          error,
        );
        return { success: false, userId };
      }),
    );

    await Promise.allSettled(promises);
  }

  /**
   * Rebuild bitset for a single user
   * @param userId User ID
   */
  private async rebuildUserBitset(
    userId: string,
  ): Promise<{ success: boolean; userId: string }> {
    try {
      await this.followBitsetService.rebuildFromEdges(userId, true);
      return { success: true, userId };
    } catch (error) {
      this.logger.error(`Failed to rebuild bitset for user ${userId}:`, error);
      return { success: false, userId };
    }
  }

  /**
   * Validate bitset consistency for a user
   * @param userId User ID
   * @returns True if consistent, false otherwise
   */
  private async validateUserBitset(userId: string): Promise<boolean> {
    try {
      // Get bitset from database
      const bitset = await this.bitsetRepo.findOne({ where: { userId } });
      if (!bitset) return true; // No bitset to validate

      // Get actual edge counts
      const [followingCount, followersCount] = await Promise.all([
        this.edgeRepo.count({
          where: { followerId: userId, status: 'active' },
        }),
        this.edgeRepo.count({
          where: { followeeId: userId, status: 'active' },
        }),
      ]);

      // Check if counts match
      const countsMatch =
        bitset.followingCount === followingCount &&
        bitset.followerCount === followersCount;

      if (!countsMatch) {
        this.logger.warn(
          `Count mismatch for user ${userId}: bitset(${bitset.followingCount}/${bitset.followerCount}) vs edges(${followingCount}/${followersCount})`,
        );
      }

      return countsMatch;
    } catch (error) {
      this.logger.error(`Failed to validate bitset for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Chunk array into smaller arrays
   * @param array Array to chunk
   * @param size Chunk size
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get task statistics
   * @returns Task statistics
   */
  async getTaskStats(): Promise<{
    totalBitsets: number;
    needsRebuild: number;
    lastRebuild: Date | null;
    avgRebuildTime: number;
  }> {
    try {
      const [totalBitsets, needsRebuild, lastRebuild] = await Promise.all([
        this.bitsetRepo.count(),
        this.bitsetRepo.count({
          where: {
            lastRebuildAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
          },
        }),
        this.bitsetRepo
          .createQueryBuilder('bitset')
          .select('MAX(bitset.lastRebuildAt)', 'lastRebuild')
          .getRawOne(),
      ]);

      return {
        totalBitsets,
        needsRebuild,
        lastRebuild: lastRebuild?.lastRebuild as Date | null,
        avgRebuildTime: 0, // Would need to track this
      };
    } catch (error) {
      this.logger.error('Failed to get task stats:', error);
      return {
        totalBitsets: 0,
        needsRebuild: 0,
        lastRebuild: null,
        avgRebuildTime: 0,
      };
    }
  }
}
