import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { GeminiImageService } from '../generation/gemini-image.service';
import { QUEUES } from '../../common/constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.CONTENT_GENERATE }),
  ],
  controllers: [ContentController],
  providers: [ContentService, GeminiImageService],
  exports: [ContentService],
})
export class ContentModule {}
