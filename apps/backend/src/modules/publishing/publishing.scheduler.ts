import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { QUEUES } from '../../common/constants';

@Injectable()
export class PublishingScheduler {
  private readonly logger = new Logger(PublishingScheduler.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.PUBLISH_EXECUTE) private publishQueue: Queue,
  ) {}

  /**
   * Every minute, check for posts that are due to be published
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPosts() {
    const now = new Date();
    const dueItems = await this.prisma.publishQueue.findMany({
      where: {
        status: 'QUEUED',
        scheduledAt: { lte: now },
      },
      take: 50, // Process in batches
    });

    if (dueItems.length === 0) return;

    this.logger.log(`Found ${dueItems.length} posts due for publishing`);

    for (const item of dueItems) {
      await this.publishQueue.add(
        'publish',
        { publishQueueId: item.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: `publish:${item.id}`,
        },
      );
    }
  }
}
