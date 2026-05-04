import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../config/redis.module';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      service: 'contentai-backend',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  async getReadiness() {
    const checks: Record<string, any> = {
      database: false,
      redis: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', message: 'Database is not ready', checks });
    }

    try {
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG';
    } catch {
      throw new ServiceUnavailableException({ status: 'error', message: 'Redis is not ready', checks });
    }

    if (!checks.redis) {
      throw new ServiceUnavailableException({ status: 'error', message: 'Redis ping returned unexpected response', checks });
    }

    return {
      status: 'ok',
      service: 'contentai-backend',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Rich monitoring endpoint — business metrics + env checks
   */
  async getStatus() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [orgs, clients, pendingJobs, failedJobs, recentContent, expiringTokens, generatingStuck] = await Promise.allSettled([
      this.prisma.organization.count(),
      this.prisma.client.count(),
      this.prisma.publishQueue.count({ where: { status: 'QUEUED' } }),
      this.prisma.publishQueue.count({ where: { status: 'FAILED' } }),
      this.prisma.contentPiece.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.clientSocialAccount.count({
        where: { tokenExpiresAt: { lte: sevenDaysFromNow, gte: now } },
      }),
      this.prisma.contentPiece.count({
        where: {
          status: 'GENERATING',
          createdAt: { lte: new Date(now.getTime() - 10 * 60 * 1000) }, // >10 min stuck
        },
      }),
    ]);

    const env = {
      anthropic: !!this.config.get('ANTHROPIC_API_KEY'),
      gemini: !!this.config.get('GEMINI_API_KEY'),
      stripe: !!this.config.get('STRIPE_SECRET_KEY'),
      smtp: !!this.config.get('SMTP_HOST'),
      s3: !!this.config.get('S3_BUCKET'),
      creatify: !!this.config.get('CREATIFY_API_ID'),
      meta: !!this.config.get('META_APP_ID'),
      linkedin: !!this.config.get('LINKEDIN_CLIENT_ID'),
      x: !!this.config.get('X_CLIENT_ID'),
    };

    const val = <T>(result: PromiseSettledResult<T>) =>
      result.status === 'fulfilled' ? result.value : 'error';

    return {
      status: 'ok',
      timestamp: now.toISOString(),
      environment: env,
      metrics: {
        organizations: val(orgs),
        clients: val(clients),
        contentLast30Days: val(recentContent),
        publish: {
          pendingJobs: val(pendingJobs),
          failedJobs: val(failedJobs),
        },
        alerts: {
          expiringTokens: val(expiringTokens),
          stuckGeneratingPieces: val(generatingStuck),
        },
      },
    };
  }
}
