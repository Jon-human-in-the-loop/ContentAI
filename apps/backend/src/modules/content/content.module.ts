import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { GeminiImageService } from '../generation/gemini-image.service';
import { AiRouterService } from '../generation/ai-router.service';
import { StorageModule } from '../storage/storage.module';
import { QUEUES } from '../../common/constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.CONTENT_GENERATE }),
    StorageModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, GeminiImageService, AiRouterService],
  exports: [ContentService],
})
export class ContentModule {}
