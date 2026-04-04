import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { TASK_MODEL_MAP, AI_MODELS, MODEL_COSTS } from '../../common/constants';

export interface AiRequest {
  taskType: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  preferredModel?: string; // Override TASK_MODEL_MAP when provided
}

export interface AiResponse {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  durationMs: number;
}

@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);
  private client: Anthropic;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Route a request to the appropriate model based on task type
   */
  async generate(request: AiRequest): Promise<AiResponse> {
    const model = this.selectModel(request.taskType, request.preferredModel);
    const startTime = Date.now();

    this.logger.log(
      `Routing task "${request.taskType}" → ${model}`,
    );

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature ?? 0.8,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      const durationMs = Date.now() - startTime;
      const tokensInput = response.usage.input_tokens;
      const tokensOutput = response.usage.output_tokens;
      const cost = this.calculateCost(model, tokensInput, tokensOutput);

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      this.logger.log(
        `Completed: ${tokensInput}+${tokensOutput} tokens, $${cost.toFixed(6)}, ${durationMs}ms`,
      );

      return { content, model, tokensInput, tokensOutput, cost, durationMs };
    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`);

      // Fallback: if premium model fails, try lite
      if (model === AI_MODELS.PREMIUM) {
        this.logger.warn('Falling back to lite model');
        return this.generate({
          ...request,
          taskType: 'fallback', // Forces lite model
        });
      }
      throw error;
    }
  }

  /**
   * Select the appropriate model for a task
   */
  private selectModel(taskType: string, preferredModel?: string): string {
    if (preferredModel) return preferredModel;
    return TASK_MODEL_MAP[taskType] || AI_MODELS.LITE;
  }

  /**
   * Calculate cost in USD
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model] || MODEL_COSTS[AI_MODELS.LITE];
    return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
  }
}
