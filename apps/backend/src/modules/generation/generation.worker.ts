import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AiRouterService } from './ai-router.service';
import { AiCacheService } from './ai-cache.service';
import { PromptBuilderService } from './prompt-builder.service';
import { CostTrackerService } from './cost-tracker.service';
import { NotebookService } from '../notebook/notebook.service';
import { QUEUES } from '../../common/constants';

interface GenerationJobData {
  requestId: string;
  orgId: string;
  clientId: string;
  type: string; // POST, REEL, STORY, CAROUSEL
  brief: string;
  platforms?: string[];
  index: number;
  brandProfile: any;
  clientName: string;
  industry: string;
}

@Processor(QUEUES.CONTENT_GENERATE, {
  concurrency: 5,
  limiter: { max: 50, duration: 60000 },
})
export class GenerationWorker extends WorkerHost {
  private readonly logger = new Logger(GenerationWorker.name);

  constructor(
    private prisma: PrismaService,
    private aiRouter: AiRouterService,
    private cache: AiCacheService,
    private promptBuilder: PromptBuilderService,
    private costTracker: CostTrackerService,
    private notebookService: NotebookService,
  ) {
    super();
  }

  async process(job: Job<GenerationJobData>): Promise<any> {
    const { data } = job;
    this.logger.log(
      `Processing: ${data.type} #${data.index} for ${data.clientName} [${job.id}]`,
    );

    try {
      // 1. Create content piece record
      const piece = await this.prisma.contentPiece.create({
        data: {
          requestId: data.requestId,
          clientId: data.clientId,
          orgId: data.orgId,
          type: data.type as any,
          platform: data.platforms?.[0] as any,
          status: 'GENERATING',
        },
      });

      // 2. Build generation context (including brand notebook)
      const notebookContext = await this.notebookService.buildContext(data.clientId);
      const context = {
        clientName: data.clientName,
        industry: data.industry,
        brief: data.brief,
        type: data.type,
        platform: data.platforms?.[0],
        brandProfile: data.brandProfile || {},
        index: data.index,
        notebookContext,
      };

      // 3. Check cache
      const cacheKey = this.cache.generateKey(data.clientId, data.type, data.brief);
      let cachedResult = await this.cache.getExactMatch(cacheKey);

      let result: any;
      let model: string;
      let tokensInput = 0;
      let tokensOutput = 0;
      let cost = 0;
      let durationMs = 0;
      let fromCache = false;

      if (cachedResult && data.index === 0) {
        // Use exact cache only for first variation
        result = JSON.parse(cachedResult);
        model = 'cache';
        fromCache = true;
        this.logger.log(`Using cached result for ${data.type} #${data.index}`);
      } else {
        // Check semantic cache for adaptation
        const semanticHit = await this.cache.getSemanticMatch(
          data.clientId,
          data.type,
          data.brief,
        );

        if (semanticHit && data.index > 0) {
          // Adapt existing content with lite model
          const adaptResponse = await this.aiRouter.generate({
            taskType: 'generate:variation',
            systemPrompt: this.promptBuilder.buildSystemPrompt(context),
            userPrompt: `Based on this existing content, create a fresh variation:\n${semanticHit}\n\nBrief: ${data.brief}\nThis is variation #${data.index + 1}. Make it different but on-brand.`,
            maxTokens: 1024,
            temperature: 0.9,
          });

          result = this.parseAiResponse(adaptResponse.content);
          model = adaptResponse.model;
          tokensInput = adaptResponse.tokensInput;
          tokensOutput = adaptResponse.tokensOutput;
          cost = adaptResponse.cost;
          durationMs = adaptResponse.durationMs;
        } else {
          // Full generation with premium model
          const taskType = this.promptBuilder.getTaskType(data.type);
          const response = await this.aiRouter.generate({
            taskType,
            systemPrompt: this.promptBuilder.buildSystemPrompt(context),
            userPrompt: this.promptBuilder.buildUserPrompt(context),
            maxTokens: 1500,
            temperature: 0.8,
          });

          result = this.parseAiResponse(response.content);
          model = response.model;
          tokensInput = response.tokensInput;
          tokensOutput = response.tokensOutput;
          cost = response.cost;
          durationMs = response.durationMs;

          // Cache the result
          await this.cache.set(cacheKey, model, response.content, tokensInput + tokensOutput);
        }
      }

      // 4. Update content piece with generated content
      await this.prisma.contentPiece.update({
        where: { id: piece.id },
        data: {
          status: 'DRAFT',
          caption: result.caption || null,
          hashtags: result.hashtags || [],
          visualPrompt: result.visualPrompt || null,
          script: result.script || null,
          hook: result.hook || null,
          cta: result.cta || null,
          modelUsed: model,
          tokensInput,
          tokensOutput,
          generationCost: cost,
          generationTimeMs: durationMs,
        },
      });

      // 5. Track costs
      if (!fromCache) {
        await this.costTracker.logUsage({
          orgId: data.orgId,
          model,
          tokensInput,
          tokensOutput,
          cost,
          taskType: this.promptBuilder.getTaskType(data.type),
          contentPieceId: piece.id,
          cached: fromCache,
        });
      }

      // 6. Update request progress
      await this.prisma.contentRequest.update({
        where: { id: data.requestId },
        data: { completedPieces: { increment: 1 } },
      });

      // Check if all pieces are done
      const request = await this.prisma.contentRequest.findUnique({
        where: { id: data.requestId },
      });
      if (request && request.completedPieces >= request.totalPieces) {
        await this.prisma.contentRequest.update({
          where: { id: data.requestId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      this.logger.log(
        `Completed: ${data.type} #${data.index} for ${data.clientName} ` +
        `[${fromCache ? 'CACHED' : model}] $${cost.toFixed(6)}`,
      );

      return { pieceId: piece.id, status: 'DRAFT' };
    } catch (error) {
      this.logger.error(
        `Failed: ${data.type} #${data.index} for ${data.clientName}: ${error.message}`,
      );

      // Update request status on failure
      await this.prisma.contentRequest.update({
        where: { id: data.requestId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  /**
   * Parse AI response, handling both JSON and plain text
   */
  private parseAiResponse(content: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, treat as plain text caption
    }

    return {
      caption: content,
      hashtags: [],
      hook: content.split('\n')[0] || content.substring(0, 100),
      cta: '',
      visualPrompt: '',
    };
  }
}
