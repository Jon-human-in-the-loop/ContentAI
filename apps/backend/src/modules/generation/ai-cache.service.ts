import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../config/redis.module';
import { CACHE_TTL } from '../../common/constants';

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate a cache key from prompt components
   */
  generateKey(clientId: string, type: string, prompt: string): string {
    const normalized = `${clientId}:${type}:${prompt.toLowerCase().trim()}`;
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Level 1: Check exact match in Redis
   */
  async getExactMatch(cacheKey: string): Promise<string | null> {
    const cached = await this.redis.get(`ai:cache:${cacheKey}`);
    if (cached) {
      this.logger.log(`Cache HIT (L1 exact): ${cacheKey.substring(0, 12)}...`);
      // Update hit count in background
      this.incrementHitCount(cacheKey).catch(() => {});
      return cached;
    }
    return null;
  }

  /**
   * Level 2: Check semantic match in PostgreSQL
   * Looks for similar prompts from the same client/industry
   */
  async getSemanticMatch(
    clientId: string,
    type: string,
    brief: string,
  ): Promise<string | null> {
    // Look for cached results from the same client with similar content type
    const cached = await this.prisma.aiCache.findFirst({
      where: {
        cacheKey: {
          startsWith: createHash('sha256')
            .update(`${clientId}:${type}:`)
            .digest('hex')
            .substring(0, 16),
        },
        expiresAt: { gt: new Date() },
      },
      orderBy: { hitCount: 'desc' },
    });

    if (cached) {
      this.logger.log(`Cache HIT (L2 semantic): reusing similar content`);
      return cached.response;
    }
    return null;
  }

  /**
   * Store result in both cache levels
   */
  async set(
    cacheKey: string,
    model: string,
    response: string,
    tokensSaved: number,
  ): Promise<void> {
    // Level 1: Redis (fast, short TTL)
    await this.redis.setex(
      `ai:cache:${cacheKey}`,
      CACHE_TTL.EXACT_MATCH,
      response,
    );

    // Level 2: PostgreSQL (persistent, longer TTL)
    await this.prisma.aiCache.upsert({
      where: { cacheKey_model: { cacheKey, model } },
      create: {
        cacheKey,
        model,
        promptHash: cacheKey,
        response,
        tokensSaved,
        expiresAt: new Date(Date.now() + CACHE_TTL.SEMANTIC_MATCH * 1000),
      },
      update: {
        response,
        tokensSaved,
        hitCount: { increment: 1 },
        expiresAt: new Date(Date.now() + CACHE_TTL.SEMANTIC_MATCH * 1000),
      },
    });
  }

  /**
   * Invalidate cache for a client (when brand profile changes)
   */
  async invalidateClient(clientId: string): Promise<void> {
    const pattern = `ai:cache:${createHash('sha256')
      .update(`${clientId}:`)
      .digest('hex')
      .substring(0, 16)}*`;

    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.logger.log(`Invalidated ${keys.length} cache entries for client ${clientId}`);
  }

  private async incrementHitCount(cacheKey: string): Promise<void> {
    await this.prisma.aiCache.updateMany({
      where: { cacheKey },
      data: { hitCount: { increment: 1 } },
    });
  }

  /**
   * Clean expired cache entries (called by cron)
   */
  async cleanExpired(): Promise<number> {
    const result = await this.prisma.aiCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
