import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PublishingService } from './publishing.service';
import { PublishingWorker } from './publishing.worker';
import { PublishingScheduler } from './publishing.scheduler';
import { OAuthModule } from '../oauth/oauth.module';
import { QUEUES } from '../../common/constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.PUBLISH_EXECUTE }),
    OAuthModule, // needed for auto-refresh
  ],
  providers: [PublishingService, PublishingWorker, PublishingScheduler],
  exports: [PublishingService],
})
export class PublishingModule {}
