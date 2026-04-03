import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../config/redis.module';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      service: 'contentai-backend',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database is not ready',
        checks,
      });
    }

    try {
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG';
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Redis is not ready',
        checks,
      });
    }

    if (!checks.redis) {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Redis ping returned unexpected response',
        checks,
      });
    }

    return {
      status: 'ok',
      service: 'contentai-backend',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
