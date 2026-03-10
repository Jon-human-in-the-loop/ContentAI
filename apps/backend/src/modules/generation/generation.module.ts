import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GenerationWorker } from './generation.worker';
import { AiRouterService } from './ai-router.service';
import { AiCacheService } from './ai-cache.service';
import { PromptBuilderService } from './prompt-builder.service';
import { CostTrackerService } from './cost-tracker.service';
import { QUEUES } from '../../common/constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.CONTENT_GENERATE },
      { name: QUEUES.CONTENT_HASHTAGS },
      { name: QUEUES.CONTENT_VISUAL },
    ),
  ],
  providers: [
    GenerationWorker,
    AiRouterService,
    AiCacheService,
    PromptBuilderService,
    CostTrackerService,
  ],
  exports: [AiRouterService, CostTrackerService],
})
export class GenerationModule {}
