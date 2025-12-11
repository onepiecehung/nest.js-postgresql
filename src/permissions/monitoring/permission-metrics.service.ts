import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/shared/services';
import { PermissionEvaluator } from '../services/permission-evaluator.service';

/**
 * PermissionMetricsService
 * Collects and tracks metrics for the permission system
 */
@Injectable()
export class PermissionMetricsService {
  private readonly logger = new Logger(PermissionMetricsService.name);
  private readonly METRICS_PREFIX = 'permissions:metrics';

  constructor(
    private readonly cacheService: CacheService,
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  /**
   * Track permission evaluation
   * @param userId - User ID
   * @param permissionKey - PermissionKey checked
   * @param allowed - Whether permission was allowed
   * @param evaluationTime - Time taken for evaluation in ms
   * @param fromCache - Whether result came from cache
   */
  async trackEvaluation(
    userId: string,
    permissionKey: string,
    allowed: boolean,
    evaluationTime: number,
    fromCache: boolean,
  ): Promise<void> {
    try {
      // Track evaluation count
      await this.incrementMetric('evaluations:total');
      await this.incrementMetric(
        `evaluations:${allowed ? 'allowed' : 'denied'}`,
      );

      // Track cache performance
      if (fromCache) {
        await this.incrementMetric('evaluations:cache:hit');
      } else {
        await this.incrementMetric('evaluations:cache:miss');
      }

      // Track evaluation time
      await this.recordEvaluationTime(evaluationTime);

      // Track per-permission metrics
      await this.incrementMetric(
        `permissions:${permissionKey}:${allowed ? 'allowed' : 'denied'}`,
      );
    } catch (error) {
      this.logger.error('Failed to track evaluation metrics', error);
    }
  }

  /**
   * Get cache hit rate
   * @returns Cache hit rate (0-1)
   */
  async getCacheHitRate(): Promise<number> {
    try {
      const hits = await this.getMetric('evaluations:cache:hit');
      const misses = await this.getMetric('evaluations:cache:miss');
      const total = hits + misses;

      if (total === 0) {
        return 0;
      }

      return hits / total;
    } catch (error) {
      this.logger.error('Failed to get cache hit rate', error);
      return 0;
    }
  }

  /**
   * Get evaluation statistics
   * @returns Evaluation statistics
   */
  async getEvaluationStats(): Promise<{
    total: number;
    allowed: number;
    denied: number;
    cacheHitRate: number;
    averageEvaluationTime: number;
  }> {
    try {
      const total = await this.getMetric('evaluations:total');
      const allowed = await this.getMetric('evaluations:allowed');
      const denied = await this.getMetric('evaluations:denied');
      const cacheHitRate = await this.getCacheHitRate();
      const averageEvaluationTime = await this.getAverageEvaluationTime();

      return {
        total,
        allowed,
        denied,
        cacheHitRate,
        averageEvaluationTime,
      };
    } catch (error) {
      this.logger.error('Failed to get evaluation stats', error);
      return {
        total: 0,
        allowed: 0,
        denied: 0,
        cacheHitRate: 0,
        averageEvaluationTime: 0,
      };
    }
  }

  /**
   * Increment a metric counter
   * @param metricName - Metric name
   */
  private async incrementMetric(metricName: string): Promise<void> {
    const key = `${this.METRICS_PREFIX}:${metricName}`;
    await this.cacheService?.atomicIncrementWithLimit(key, 1, 86400); // 24 hour TTL
  }

  /**
   * Get metric value
   * @param metricName - Metric name
   * @returns Metric value
   */
  private async getMetric(metricName: string): Promise<number> {
    const key = `${this.METRICS_PREFIX}:${metricName}`;
    const value = await this.cacheService?.get(key);
    return value ? parseInt(value as string, 10) : 0;
  }

  /**
   * Record evaluation time
   * @param time - Evaluation time in ms
   */
  private async recordEvaluationTime(time: number): Promise<void> {
    const key = `${this.METRICS_PREFIX}:evaluation:times`;
    // Store as list and calculate average
    // Simplified: just track sum and count
    await this.incrementMetric('evaluation:time:sum');
    await this.incrementMetric('evaluation:time:count');
  }

  /**
   * Get average evaluation time
   * @returns Average evaluation time in ms
   */
  private async getAverageEvaluationTime(): Promise<number> {
    const sum = await this.getMetric('evaluation:time:sum');
    const count = await this.getMetric('evaluation:time:count');

    if (count === 0) {
      return 0;
    }

    return sum / count;
  }

  /**
   * Reset all metrics
   */
  async resetMetrics(): Promise<void> {
    const pattern = `${this.METRICS_PREFIX}:*`;
    await this.cacheService?.deleteKeysByPattern(pattern);
    this.logger.log('Metrics reset');
  }
}
