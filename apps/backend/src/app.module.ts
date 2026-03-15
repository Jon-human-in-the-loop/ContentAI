import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContentModule } from './modules/content/content.module';
import { GenerationModule } from './modules/generation/generation.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './config/redis.module';
import { EncryptionModule } from './common/encryption.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get('REDIS_URL');
        if (url) return { connection: { url } } as any;
        return { connection: { host: config.get('REDIS_HOST', 'localhost'), port: parseInt(config.get('REDIS_PORT', '6379')) } };
      },
    }),
    PrismaModule, RedisModule, EncryptionModule,
    AuthModule, ClientsModule, ContentModule, GenerationModule,
    TemplatesModule, CalendarModule, PublishingModule, AnalyticsModule,
    OAuthModule, SettingsModule, StorageModule,
  ],
})
export class AppModule {}
