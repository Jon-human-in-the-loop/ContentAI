import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { PublishingService } from './publishing.service';
import { QUEUES } from '../../common/constants';

@Processor(QUEUES.PUBLISH_EXECUTE, { concurrency: 5 })
export class PublishingWorker extends WorkerHost {
  private readonly logger = new Logger(PublishingWorker.name);

  constructor(
    private prisma: PrismaService,
    private publishingService: PublishingService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { publishQueueId } = job.data;

    const queueItem = await this.prisma.publishQueue.findUnique({
      where: { id: publishQueueId },
      include: {
        contentPiece: true,
        socialAccount: true,
      },
    });

    if (!queueItem) {
      this.logger.warn(`Publish queue item not found: ${publishQueueId}`);
      return;
    }

    // Update status to publishing
    await this.prisma.publishQueue.update({
      where: { id: publishQueueId },
      data: { status: 'PUBLISHING', attempts: { increment: 1 } },
    });

    try {
      const result = await this.publishingService.publish(
        queueItem.platform,
        queueItem.socialAccount.accessToken!,
        {
          caption: queueItem.contentPiece.caption || '',
          hashtags: queueItem.contentPiece.hashtags,
          type: queueItem.contentPiece.type,
        },
      );

      if (result.success) {
        await this.prisma.$transaction([
          this.prisma.publishQueue.update({
            where: { id: publishQueueId },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              externalPostId: result.externalPostId,
            },
          }),
          this.prisma.contentPiece.update({
            where: { id: queueItem.contentPieceId },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              publishResult: result as any,
            },
          }),
        ]);

        this.logger.log(`Published: ${queueItem.platform} → ${result.externalPostId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Publish failed: ${error.message}`);

      await this.prisma.publishQueue.update({
        where: { id: publishQueueId },
        data: {
          status: queueItem.attempts + 1 >= queueItem.maxAttempts ? 'FAILED' : 'QUEUED',
          lastError: error.message,
        },
      });

      if (queueItem.attempts + 1 < queueItem.maxAttempts) {
        throw error; // Trigger BullMQ retry
      }
    }
  }
}
