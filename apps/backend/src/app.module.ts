import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Infrastructure
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './config/redis.module';
import { EncryptionModule } from './common/encryption.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContentModule } from './modules/content/content.module';
import { GenerationModule } from './modules/generation/generation.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotebookModule } from './modules/notebook/notebook.module';
import { VideoModule } from './modules/video/video.module';
import { HealthModule } from './modules/health/health.module';

// Phase 3 modules
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TtsModule } from './modules/tts/tts.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },   // 20 req/sec per IP
      { name: 'medium', ttl: 60000, limit: 200 }, // 200 req/min per IP
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get('REDIS_URL');
        if (url) return { connection: { url } } as any;
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: parseInt(config.get('REDIS_PORT', '6379')),
          },
        };
      },
    }),

    // Infrastructure (global)
    PrismaModule,
    RedisModule,
    EncryptionModule,
    NotificationsModule, // global — provides EmailService everywhere

    // Features
    AuthModule, ClientsModule, ContentModule, GenerationModule,
    TemplatesModule, CalendarModule, PublishingModule, AnalyticsModule,
    OAuthModule, SettingsModule, StorageModule, NotebookModule,
    VideoModule, HealthModule,

    // Phase 3
    BillingModule, TtsModule, AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
