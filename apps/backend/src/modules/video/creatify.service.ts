import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreateVideoParams {
  imageUrl: string;
  audioUrl: string;
  modelVersion?: 'aurora_v1' | 'aurora_v1_fast';
  webhookUrl?: string;
}

export interface VideoStatus {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  videoUrl?: string;
  error?: string;
}

@Injectable()
export class CreatifyService {
  private readonly logger = new Logger(CreatifyService.name);
  private readonly baseUrl = 'https://api.creatify.ai/api';

  constructor(private config: ConfigService) {}

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-ID': this.config.get('CREATIFY_API_ID', ''),
      'X-API-KEY': this.config.get('CREATIFY_API_KEY', ''),
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('CREATIFY_API_ID') &&
      this.config.get('CREATIFY_API_KEY')
    );
  }

  /**
   * Create an avatar video from an image and audio file.
   * Returns the video job ID for status polling.
   */
  async createVideo(params: CreateVideoParams): Promise<{ id: string } | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Creatify API not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/aurora/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          image: params.imageUrl,
          audio: params.audioUrl,
          model_version: params.modelVersion || 'aurora_v1_fast',
          ...(params.webhookUrl ? { webhook_url: params.webhookUrl } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Creatify create video failed:', data);
        return null;
      }

      this.logger.log(`Creatify video job created: ${data.id}`);
      return { id: data.id };
    } catch (error) {
      this.logger.error('Creatify API error:', error);
      return null;
    }
  }

  /**
   * Check the status of a video generation job
   */
  async getVideoStatus(videoId: string): Promise<VideoStatus | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(`${this.baseUrl}/aurora/${videoId}/`, {
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Creatify status check failed for ${videoId}:`, data);
        return null;
      }

      return {
        id: data.id,
        status: data.status,
        videoUrl: data.output || data.video_url || undefined,
        error: data.error || undefined,
      };
    } catch (error) {
      this.logger.error(`Creatify status error for ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Poll until video is done or failed (with timeout)
   */
  async waitForVideo(videoId: string, maxWaitMs = 300000): Promise<VideoStatus | null> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getVideoStatus(videoId);
      if (!status) return null;

      if (status.status === 'done' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    this.logger.warn(`Creatify video ${videoId} timed out after ${maxWaitMs}ms`);
    return { id: videoId, status: 'processing' };
  }
}
