import {
  ipWhitelistSeed,
  plansSeed,
  rateLimitPoliciesSeed,
} from 'src/db/seed/rate-limit';
import { COMMON_CONSTANTS } from 'src/shared/constants';
import { Repository } from 'typeorm';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  ApiKeyResolution,
  CacheStats,
  RateLimitContext,
  RateLimitInfo,
  RateLimitResult,
} from '../common/interface';
import { CacheService } from '../shared/services/cache/cache.service';
import {
  CreateApiKeyDto,
  CreateIpWhitelistDto,
  CreatePlanDto,
  PolicyMatchResponseDto,
  UpdateApiKeyDto,
  UpdateIpWhitelistDto,
  UpdatePlanDto,
} from './dto';
import {
  CreateRateLimitPolicyDto,
  TestPolicyMatchDto,
  UpdateRateLimitPolicyDto,
} from './dto/rate-limit-policy.dto';
import { ApiKey } from './entities/api-key.entity';
import { IpWhitelist } from './entities/ip-whitelist.entity';
import { Plan } from './entities/plan.entity';
import { RateLimitPolicy } from './entities/rate-limit-policy.entity';

/**
 * Unified Rate Limit Service
 * Handles all rate limiting logic in one place
 */
@Injectable()
export class RateLimitService implements OnModuleInit {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly ANONYMOUS_PLAN = 'anonymous';
  private readonly ANONYMOUS_PLAN_DEFAULT = {
    name: 'anonymous',
    limitPerMin: 5,
    ttlSec: 60,
    active: true,
    displayOrder: 1,
    description: 'Dummy plan for anonymous users',
  };

  constructor(
    @InjectRepository(Plan)
    private readonly plansRepo: Repository<Plan>,

    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,

    @InjectRepository(IpWhitelist)
    private readonly ipRepo: Repository<IpWhitelist>,

    @InjectRepository(RateLimitPolicy)
    private readonly policyRepo: Repository<RateLimitPolicy>,

    private readonly cacheService: CacheService,
  ) {
    this.setupCacheInvalidation();
  }

  async onModuleInit(): Promise<void> {
    await this.initializeData();
  }

  /**
   * Initialize rate limit data if not already exists
   * Checks for existing data before seeding to avoid duplicates
   */
  private async initializeData(): Promise<void> {
    try {
      // Check if plans already exist
      const existingPlansCount = await this.plansRepo.count();

      if (existingPlansCount === 0) {
        this.logger.log('No plans found, initializing rate limit data...');

        // Initialize plans with their associated API keys
        const planData = this.plansRepo.create(plansSeed);
        const plans = await this.plansRepo.save(planData);
        this.logger.log(`Initialized ${plans.length} rate limit plans`);

        // Initialize IP whitelist entries
        const ipWhitelistCount = await this.ipRepo.count();
        if (ipWhitelistCount === 0) {
          const ipWhitelistData = this.ipRepo.create(ipWhitelistSeed);
          const ipWhitelist = await this.ipRepo.save(ipWhitelistData);
          this.logger.log(
            `Initialized ${ipWhitelist.length} IP whitelist entries`,
          );
        }

        // Initialize rate limit policies
        const policiesCount = await this.policyRepo.count();
        if (policiesCount === 0) {
          const policiesData = this.policyRepo.create(rateLimitPoliciesSeed);
          const policies = await this.policyRepo.save(policiesData);
          this.logger.log(`Initialized ${policies.length} rate limit policies`);
        }

        this.logger.log(
          'Rate limit data initialization completed successfully',
        );
      } else {
        this.logger.log(
          `Rate limit data already exists (${existingPlansCount} plans found), skipping initialization`,
        );
      }
    } catch (error) {
      this.logger.error('Error initializing rate limit data:', error);
      throw error;
    }
  }

  /**
   * Setup Redis pub/sub for cache invalidation
   */
  private setupCacheInvalidation(): void {
    const redis = this.cacheService.getRedisClient();
    const subscriberRedis = redis.duplicate();
    void subscriberRedis.subscribe('ratelimit:invalidate');
    subscriberRedis.on('message', (channel, _message) => {
      if (channel === 'ratelimit:invalidate') {
        this.logger.log('Received cache invalidation signal');
        void this.clearAllCache().catch((error) => {
          this.logger.error('Error clearing cache:', error);
        });
      }
    });
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    try {
      // Check IP whitelist first
      if (await this.isIpWhitelisted(context.ip)) {
        this.logger.debug(`IP ${context.ip} is whitelisted, allowing request`);
        return {
          allowed: true,
          headers: { 'X-RateLimit-Status': 'whitelisted' },
        };
      }

      // Resolve API key and plan
      const apiKeyResult = await this.resolveApiKey(context.apiKey);
      if (apiKeyResult.kind === 'invalid') {
        this.logger.debug(
          'Invalid API key, using matchingPolicy or isWhitelist plan',
        );
        // return await this.applyRateLimit('anonymous', context);
      }

      if (apiKeyResult.isWhitelist) {
        this.logger.debug('API key is whitelisted, allowing request');
        return {
          allowed: true,
          headers: { 'X-RateLimit-Status': 'api-key-whitelisted' },
        };
      }

      // Check for matching policies first
      const matchingPolicy = await this.findMatchingPolicy(context);
      if (matchingPolicy) {
        this.logger.debug(`Using policy: ${matchingPolicy.name}`);
        return await this.applyPolicyRateLimit(matchingPolicy, context);
      }

      // Apply rate limit based on plan
      return await this.applyRateLimit(
        apiKeyResult.plan || 'anonymous',
        context,
      );
    } catch (error: unknown) {
      this.logger.error('Error checking rate limit:', error);
      // On error, allow the request
      return {
        allowed: true,
        headers: { 'X-RateLimit-Status': 'error-fallback' },
      };
    }
  }

  /**
   * Apply rate limit based on plan
   */
  private async applyRateLimit(
    planName: string,
    context: RateLimitContext,
  ): Promise<RateLimitResult> {
    try {
      const plan = await this.getPlan(planName);
      const key = this.generateRateLimitKey(planName, context);

      // Use Redis Lua script for atomic rate limiting
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        
        local current = redis.call('GET', key)
        if current == false then
          current = 0
        else
          current = tonumber(current)
        end
        
        if current >= limit then
          return {0, current, window}
        end
        
        local newCount = redis.call('INCR', key)
        if newCount == 1 then
          redis.call('EXPIRE', key, window)
        end
        
        return {1, newCount, window}
      `;

      const result = (await this.cacheService
        .getRedisClient()
        .eval(
          luaScript,
          1,
          key,
          plan.limitPerMin.toString(),
          plan.ttlSec.toString(),
        )) as [number, number, number];

      const [allowed, current, window] = result;

      const headers = {
        'X-RateLimit-Limit': plan.limitPerMin.toString(),
        'X-RateLimit-Remaining': Math.max(
          0,
          plan.limitPerMin - current,
        ).toString(),
        'X-RateLimit-Reset': (
          Math.floor(Date.now() / 1000) + window
        ).toString(),
        'X-RateLimit-Plan': planName,
      };

      if (allowed === 0) {
        return {
          allowed: false,
          headers: {
            ...headers,
            'Retry-After': window.toString(),
          },
          retryAfter: window,
        };
      }

      return { allowed: true, headers };
    } catch (error: unknown) {
      this.logger.error(
        `Error applying rate limit for plan ${planName}:`,
        error,
      );
      return {
        allowed: true,
        headers: { 'X-RateLimit-Status': 'error-fallback' },
      };
    }
  }

  /**
   * Generate rate limit key
   */
  private generateRateLimitKey(
    planName: string,
    context: RateLimitContext,
  ): string {
    const parts = [
      'rl',
      planName,
      context.ip,
      context.routeKey,
      context.apiKey || 'no-key',
      context.userId || 'anon',
      context.orgId || 'noorg',
    ];
    return parts.join(':');
  }

  /**
   * Get plan by name with caching
   */
  private async getPlan(name: string): Promise<Plan> {
    try {
      const cacheKey = `rl:plan:${name}`;
      const cached = await this.cacheService.get<Plan>(cacheKey);

      if (cached) {
        return cached;
      }

      const plan = await this.plansRepo.findOne({
        where: { name, active: true },
      });

      if (!plan) {
        // If requested plan is anonymous and not found, use default
        if (name === this.ANONYMOUS_PLAN) {
          this.logger.warn(
            `Anonymous plan not found in DB, using default configuration`,
          );
          return this.ANONYMOUS_PLAN_DEFAULT as Plan;
        }

        // For other plans, fallback to anonymous
        this.logger.warn(`Plan not found: ${name}, falling back to anonymous`);
        return this.getPlan(this.ANONYMOUS_PLAN);
      }

      await this.cacheService.set(cacheKey, plan, this.CACHE_TTL);
      return plan;
    } catch (error: unknown) {
      this.logger.error(`Error getting plan ${name}:`, error);

      // If error occurs and we're trying to get anonymous, use default
      if (name === this.ANONYMOUS_PLAN) {
        this.logger.warn(
          `Error getting anonymous plan, using default configuration`,
        );
        return this.ANONYMOUS_PLAN_DEFAULT as Plan;
      }

      // For other plans, fallback to anonymous
      return this.getPlan(this.ANONYMOUS_PLAN);
    }
  }

  /**
   * Resolve API key
   */
  private async resolveApiKey(rawKey?: string): Promise<ApiKeyResolution> {
    if (!rawKey) {
      return { kind: 'anonymous' };
    }

    const key = rawKey.trim();
    if (!key) {
      return { kind: 'anonymous' };
    }

    try {
      const cacheKey = `rl:apikey:${key}`;
      const cached = await this.cacheService.get<ApiKeyResolution>(cacheKey);

      if (cached) {
        return cached;
      }

      const apiKey = await this.apiKeyRepo.findOne({
        where: { key, active: true },
        select: ['id', 'plan', 'isWhitelist', 'expiresAt', 'deletedAt'],
        relations: ['plan'],
      });

      if (!apiKey || apiKey.isExpired() || !apiKey.isValid()) {
        const result = { kind: 'invalid' as const };
        await this.cacheService.set(cacheKey, result, 60);
        return result;
      }

      const result = {
        kind: 'apiKey' as const,
        plan: apiKey.plan?.name || 'anonymous',
        isWhitelist: apiKey.isWhitelist,
      };

      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
      return result;
    } catch (error: unknown) {
      this.logger.error('Error resolving API key:', error);
      return { kind: 'invalid' };
    }
  }

  /**
   * Check if IP is whitelisted
   */
  private async isIpWhitelisted(ip: string): Promise<boolean> {
    if (!ip) return false;

    try {
      const cacheKey = `rl:ipwl:${ip}`;
      const cached = await this.cacheService.get<boolean>(cacheKey);

      if (cached !== null) {
        return cached;
      }

      const whitelistEntry = await this.ipRepo.findOne({
        where: { ip, active: true },
      });

      const isWhitelisted = whitelistEntry?.isValid() || false;
      await this.cacheService.set(cacheKey, isWhitelisted, this.CACHE_TTL);

      return isWhitelisted;
    } catch (error: unknown) {
      this.logger.error(`Error checking IP whitelist for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Find matching policy for the given context
   */
  private async findMatchingPolicy(
    context: RateLimitContext,
  ): Promise<RateLimitPolicy | null> {
    try {
      const cacheKey = `rl:policies:active`;
      const cached = await this.cacheService.get<RateLimitPolicy[]>(cacheKey);

      let policies: RateLimitPolicy[];
      if (cached) {
        // Rehydrate cached policies back to class instances to restore methods
        policies = cached.map((policyData) => {
          const policy = new RateLimitPolicy();
          Object.assign(policy, policyData);
          return policy;
        });
      } else {
        policies = await this.policyRepo.find({
          where: { enabled: true, status: COMMON_CONSTANTS.STATUS.ACTIVE },
          order: { priority: 'DESC' },
        });
        await this.cacheService.set(cacheKey, policies, this.CACHE_TTL);
      }

      // Find the highest priority policy that matches
      for (const policy of policies) {
        if (policy.matches(context)) {
          return policy;
        }
      }

      return null;
    } catch (error: unknown) {
      this.logger.error('Error finding matching policy:', error);
      return null;
    }
  }

  /**
   * Apply rate limit based on policy
   */
  private async applyPolicyRateLimit(
    policy: RateLimitPolicy,
    context: RateLimitContext,
  ): Promise<RateLimitResult> {
    try {
      const params = policy.getEffectiveParams();
      const key = this.generatePolicyRateLimitKey(policy, context);

      // Use different Lua scripts based on strategy
      let luaScript: string;
      let args: string[];

      switch (params.strategy) {
        case 'fixedWindow':
          luaScript = `
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            
            local current = redis.call('GET', key)
            if current == false then
              current = 0
            else
              current = tonumber(current)
            end
            
            if current >= limit then
              return {0, current, window}
            end
            
            local newCount = redis.call('INCR', key)
            if newCount == 1 then
              redis.call('EXPIRE', key, window)
            end
            
            return {1, newCount, window}
          `;
          args = [
            params.limit?.toString() || '100',
            params.windowSec?.toString() || '60',
          ];
          break;

        case 'slidingWindow':
          luaScript = `
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            
            -- Remove expired entries
            redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
            
            -- Count current entries
            local current = redis.call('ZCARD', key)
            
            if current >= limit then
              return {0, current, window}
            end
            
            -- Add current request
            redis.call('ZADD', key, now, now)
            redis.call('EXPIRE', key, window)
            
            return {1, current + 1, window}
          `;
          args = [
            params.limit?.toString() || '100',
            params.windowSec?.toString() || '60',
            Math.floor(Date.now() / 1000).toString(),
          ];
          break;

        case 'tokenBucket':
          luaScript = `
            local key = KEYS[1]
            local burst = tonumber(ARGV[1])
            local refillRate = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            
            local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
            local tokens = tonumber(bucket[1]) or burst
            local lastRefill = tonumber(bucket[2]) or now
            
            -- Calculate tokens to add
            local timePassed = now - lastRefill
            local tokensToAdd = timePassed * refillRate
            tokens = math.min(burst, tokens + tokensToAdd)
            
            if tokens < 1 then
              redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
              redis.call('EXPIRE', key, 3600)
              return {0, 0, 1}
            end
            
            -- Consume one token
            tokens = tokens - 1
            redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
            redis.call('EXPIRE', key, 3600)
            
            return {1, tokens, 1}
          `;
          args = [
            params.burst?.toString() || '20',
            params.refillPerSec?.toString() || '5',
            Math.floor(Date.now() / 1000).toString(),
          ];
          break;

        default:
          // Fallback to fixed window
          luaScript = `
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            
            local current = redis.call('GET', key)
            if current == false then
              current = 0
            else
              current = tonumber(current)
            end
            
            if current >= limit then
              return {0, current, window}
            end
            
            local newCount = redis.call('INCR', key)
            if newCount == 1 then
              redis.call('EXPIRE', key, window)
            end
            
            return {1, newCount, window}
          `;
          args = ['100', '60'];
      }

      const result = (await this.cacheService
        .getRedisClient()
        .eval(luaScript, 1, key, ...args)) as [number, number, number];
      const [allowed, current, window] = result;

      const headers = {
        'X-RateLimit-Limit': (params.limit || params.burst || 100).toString(),
        'X-RateLimit-Remaining': Math.max(
          0,
          (params.limit || params.burst || 100) - current,
        ).toString(),
        'X-RateLimit-Reset': (
          Math.floor(Date.now() / 1000) + window
        ).toString(),
        'X-RateLimit-Policy': policy.name,
        'X-RateLimit-Strategy': params.strategy,
      };

      if (allowed === 0) {
        return {
          allowed: false,
          headers: {
            ...headers,
            'Retry-After': window.toString(),
          },
          retryAfter: window,
        };
      }

      return { allowed: true, headers };
    } catch (error: unknown) {
      this.logger.error(
        `Error applying policy rate limit for ${policy.name}:`,
        error,
      );
      return {
        allowed: true,
        headers: { 'X-RateLimit-Status': 'error-fallback' },
      };
    }
  }

  /**
   * Generate rate limit key for policy
   */
  private generatePolicyRateLimitKey(
    policy: RateLimitPolicy,
    context: RateLimitContext,
  ): string {
    const parts = ['rl', 'policy', policy.name];

    switch (policy.scope) {
      case 'global':
        parts.push('global');
        break;
      case 'route':
        parts.push('route', context.routeKey);
        break;
      case 'user':
        parts.push('user', context.userId || 'anon');
        break;
      case 'org':
        parts.push('org', context.orgId || 'noorg');
        break;
      case 'ip':
        parts.push('ip', context.ip);
        break;
    }

    return parts.join(':');
  }

  /**
   * Clear all cache
   */
  private async clearAllCache(): Promise<void> {
    try {
      const deletedCount = await this.cacheService.deleteKeysByPattern('rl:*');
      this.logger.log(`Cleared ${deletedCount} cache entries`);
    } catch (error: unknown) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Publish cache invalidation
   */
  async publishCacheInvalidation(): Promise<void> {
    try {
      await this.cacheService.getRedisClient().publish(
        'ratelimit:invalidate',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'rate-limit-service',
        }),
      );
    } catch (error: unknown) {
      this.logger.error('Error publishing cache invalidation:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const [planCount, ipCount, apiKeyCount, policyCount] = await Promise.all([
        this.cacheService.countKeysByPattern('rl:plan:*'),
        this.cacheService.countKeysByPattern('rl:ipwl:*'),
        this.cacheService.countKeysByPattern('rl:apikey:*'),
        this.cacheService.countKeysByPattern('rl:policy:*'),
      ]);

      return {
        planCount,
        ipWhitelistCount: ipCount,
        apiKeyCount,
        policyCount,
      };
    } catch (error: unknown) {
      this.logger.error('Error getting cache stats:', error);
      return {
        planCount: 0,
        ipWhitelistCount: 0,
        apiKeyCount: 0,
        policyCount: 0,
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    try {
      const pattern = key.includes(':')
        ? `${key.split(':')[0]}:${key.split(':')[1]}:*`
        : `${key}*`;
      const deletedCount = await this.cacheService.deleteKeysByPattern(pattern);
      this.logger.log(
        `Reset rate limit for pattern: ${pattern} (${deletedCount} keys)`,
      );
    } catch (error: unknown) {
      this.logger.error(`Error resetting rate limit for key ${key}:`, error);
    }
  }

  /**
   * Get rate limit info for a key
   */
  async getRateLimitInfo(key: string): Promise<RateLimitInfo> {
    try {
      const exists = await this.cacheService.exists(key);
      if (!exists) {
        return { current: 0, limit: 0 };
      }

      const ttl = await this.cacheService.getTtl(key);
      const value = await this.cacheService.get<string>(key);

      return {
        current: parseInt(value || '0'),
        limit: 0, // Would need to know the plan to get limit
        resetTime: ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : undefined,
      };
    } catch (error: unknown) {
      this.logger.error(`Error getting rate limit info for key ${key}:`, error);
      return { current: 0, limit: 0 };
    }
  }

  // CRUD methods for admin
  async getAllPlans(): Promise<Plan[]> {
    return this.plansRepo.find({
      where: { active: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createApiKey(keyData: CreateApiKeyDto): Promise<ApiKey> {
    const { planId, ...restData } = keyData;
    const apiKey = this.apiKeyRepo.create({
      ...restData,
      planId: planId ?? undefined,
    });
    const saved = await this.apiKeyRepo.save(apiKey);
    await this.publishCacheInvalidation();
    return saved;
  }

  async updateApiKey(id: string, updateData: UpdateApiKeyDto): Promise<ApiKey> {
    const { planId, ...restData } = updateData;
    const updatePayload = {
      ...restData,
      ...(planId ? { planId } : {}),
    };
    await this.apiKeyRepo.update(id, updatePayload);
    const updated = await this.apiKeyRepo.findOne({ where: { id } });
    if (!updated) throw new Error('API key not found');
    await this.publishCacheInvalidation();
    return updated;
  }

  async addIpToWhitelist(ipData: CreateIpWhitelistDto): Promise<IpWhitelist> {
    const whitelistEntry = this.ipRepo.create(ipData);
    const saved = await this.ipRepo.save(whitelistEntry);
    await this.publishCacheInvalidation();
    return saved;
  }

  async removeIpFromWhitelist(id: string): Promise<void> {
    await this.ipRepo.softDelete(id);
    await this.publishCacheInvalidation();
  }

  // Additional CRUD methods for admin
  async createPlan(planData: CreatePlanDto): Promise<Plan> {
    const plan = this.plansRepo.create(planData);
    const saved = await this.plansRepo.save(plan);
    await this.publishCacheInvalidation();
    return saved;
  }

  async updatePlan(name: string, updateData: UpdatePlanDto): Promise<Plan> {
    await this.plansRepo.update(name, updateData);
    const updated = await this.plansRepo.findOne({ where: { name } });
    if (!updated) throw new Error('Plan not found');
    await this.publishCacheInvalidation();
    return updated;
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.apiKeyRepo.softDelete(id);
    await this.publishCacheInvalidation();
  }

  async getAllIpWhitelist(): Promise<IpWhitelist[]> {
    return this.ipRepo.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateIpWhitelist(
    id: string,
    updateData: UpdateIpWhitelistDto,
  ): Promise<IpWhitelist> {
    await this.ipRepo.update(id, updateData);
    const updated = await this.ipRepo.findOne({ where: { id } });
    if (!updated) throw new Error('IP whitelist entry not found');
    await this.publishCacheInvalidation();
    return updated;
  }

  // Policy CRUD methods
  async getAllPolicies(): Promise<RateLimitPolicy[]> {
    return this.policyRepo.find({
      where: { enabled: true },
      order: { priority: 'DESC' },
    });
  }

  async createPolicy(
    policyData: CreateRateLimitPolicyDto,
  ): Promise<RateLimitPolicy> {
    const policy = this.policyRepo.create(policyData);
    const saved = await this.policyRepo.save(policy);
    await this.publishCacheInvalidation();
    return saved;
  }

  async updatePolicy(
    id: string,
    updateData: UpdateRateLimitPolicyDto,
  ): Promise<RateLimitPolicy> {
    await this.policyRepo.update(id, updateData);
    const updated = await this.policyRepo.findOne({ where: { id } });
    if (!updated) throw new Error('Policy not found');
    await this.publishCacheInvalidation();
    return updated;
  }

  async deletePolicy(id: string): Promise<void> {
    await this.policyRepo.softDelete(id);
    await this.publishCacheInvalidation();
  }

  async getPolicyByName(name: string): Promise<RateLimitPolicy | null> {
    return this.policyRepo.findOne({ where: { name } });
  }

  async testPolicyMatch(
    policyId: string,
    context: TestPolicyMatchDto,
  ): Promise<PolicyMatchResponseDto> {
    const policy = await this.policyRepo.findOne({ where: { id: policyId } });
    if (!policy) {
      return { matches: false, policy: null };
    }

    const matches = policy.matches(context);
    return { matches, policy };
  }
}
