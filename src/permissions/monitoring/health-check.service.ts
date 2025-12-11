import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/shared/services';
import { PermissionEvaluator } from '../services/permission-evaluator.service';
import { PermissionRegistry } from '../services/permission-registry.service';
import { PermissionMetricsService } from './permission-metrics.service';

/**
 * PermissionHealthCheckService
 * Provides health check endpoints and diagnostics
 */
@Injectable()
export class PermissionHealthCheckService {
  private readonly logger = new Logger(PermissionHealthCheckService.name);

  constructor(
    private readonly permissionRegistry: PermissionRegistry,
    private readonly permissionEvaluator: PermissionEvaluator,
    private readonly permissionMetrics: PermissionMetricsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Perform health check
   * @returns Health check result
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    checks: {
      registry: boolean;
      cache: boolean;
      evaluator: boolean;
    };
    metrics: {
      cacheHitRate: number;
      totalEvaluations: number;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const checks = {
      registry: false,
      cache: false,
      evaluator: false,
    };

    // Check 1: Registry
    try {
      const permissionCount = this.permissionRegistry.getPermissionCount();
      if (permissionCount > 0) {
        checks.registry = true;
      } else {
        issues.push('PermissionRegistry has no permissions registered');
      }
    } catch (error) {
      issues.push(
        `PermissionRegistry check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Check 2: Cache
    try {
      const testKey = 'permissions:health:test';
      await this.cacheService?.set(testKey, 'test', 10);
      const value = await this.cacheService?.get(testKey);
      if (value === 'test') {
        checks.cache = true;
        await this.cacheService?.delete(testKey);
      } else {
        issues.push('Cache read/write test failed');
      }
    } catch (error) {
      issues.push(
        `Cache check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Check 3: Evaluator
    try {
      // Try a simple evaluation
      const result = await this.permissionEvaluator.evaluate(
        'health-check-user',
        'article.read',
      );
      // Result doesn't matter, just that it doesn't throw
      checks.evaluator = true;
    } catch (error) {
      issues.push(
        `Evaluator check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Get metrics
    const cacheHitRate = await this.permissionMetrics.getCacheHitRate();
    const stats = await this.permissionMetrics.getEvaluationStats();

    return {
      healthy: checks.registry && checks.cache && checks.evaluator,
      checks,
      metrics: {
        cacheHitRate,
        totalEvaluations: stats.total,
      },
      issues,
    };
  }

  /**
   * Get system status
   * @returns System status information
   */
  async getSystemStatus(): Promise<{
    registry: {
      permissionCount: number;
      maxBitIndex: number;
    };
    cache: {
      enabled: boolean;
      hitRate: number;
    };
    metrics: {
      totalEvaluations: number;
      allowed: number;
      denied: number;
      averageEvaluationTime: number;
    };
  }> {
    const registryStatus = {
      permissionCount: this.permissionRegistry.getPermissionCount(),
      maxBitIndex: this.permissionRegistry.getMaxBitIndex(),
    };

    const cacheHitRate = await this.permissionMetrics.getCacheHitRate();
    const stats = await this.permissionMetrics.getEvaluationStats();

    return {
      registry: registryStatus,
      cache: {
        enabled: true, // Cache is always enabled
        hitRate: cacheHitRate,
      },
      metrics: {
        totalEvaluations: stats.total,
        allowed: stats.allowed,
        denied: stats.denied,
        averageEvaluationTime: stats.averageEvaluationTime,
      },
    };
  }
}
