import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [{
    provide: REDIS_CLIENT,
    useFactory: (config: ConfigService) => {
      const url = config.get('REDIS_URL');
      if (url) return new Redis(url);
      return new Redis({ host: config.get('REDIS_HOST', 'localhost'), port: config.get('REDIS_PORT', 6379), password: config.get('REDIS_PASSWORD') });
    },
    inject: [ConfigService],
  }],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
