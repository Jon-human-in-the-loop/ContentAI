import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { CreatifyService } from './creatify.service';
import { StorageService } from '../storage/storage.service';

@Controller('video')
export class VideoController {
  constructor(
    private readonly creatify: CreatifyService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * GET /api/v1/video/status
   * Check if Creatify is configured
   */
  @Get('status')
  getStatus() {
    return {
      configured: this.creatify.isConfigured(),
      provider: 'creatify_aurora',
    };
  }

  /**
   * POST /api/v1/video/generate
   * Create an avatar video from image + audio URLs
   */
  @Post('generate')
  async generateVideo(
    @Request() req,
    @Body() body: {
      imageUrl: string;
      audioUrl: string;
      modelVersion?: 'aurora_v1' | 'aurora_v1_fast';
      contentPieceId?: string;
    },
  ) {
    if (!this.creatify.isConfigured()) {
      return { success: false, message: 'Creatify API not configured' };
    }

    const result = await this.creatify.createVideo({
      imageUrl: body.imageUrl,
      audioUrl: body.audioUrl,
      modelVersion: body.modelVersion,
    });

    if (!result) {
      return { success: false, message: 'Failed to create video job' };
    }

    return {
      success: true,
      videoJobId: result.id,
      message: 'Video generation started. Poll /video/jobs/:id for status.',
    };
  }

  /**
   * GET /api/v1/video/jobs/:id
   * Check video generation status
   */
  @Get('jobs/:id')
  async getJobStatus(@Param('id') id: string) {
    const status = await this.creatify.getVideoStatus(id);
    if (!status) {
      return { success: false, message: 'Failed to check video status' };
    }

    return {
      success: true,
      ...status,
    };
  }

  /**
   * POST /api/v1/video/generate-and-wait
   * Create a video and wait for it to complete (long polling, up to 5 min)
   */
  @Post('generate-and-wait')
  async generateAndWait(
    @Request() req,
    @Body() body: {
      imageUrl: string;
      audioUrl: string;
      modelVersion?: 'aurora_v1' | 'aurora_v1_fast';
      contentPieceId?: string;
    },
  ) {
    const orgId = req.user.orgId;

    if (!this.creatify.isConfigured()) {
      return { success: false, message: 'Creatify API not configured' };
    }

    const job = await this.creatify.createVideo({
      imageUrl: body.imageUrl,
      audioUrl: body.audioUrl,
      modelVersion: body.modelVersion,
    });

    if (!job) {
      return { success: false, message: 'Failed to create video job' };
    }

    const result = await this.creatify.waitForVideo(job.id);

    if (!result || result.status === 'failed') {
      return {
        success: false,
        message: result?.error || 'Video generation failed',
        videoJobId: job.id,
      };
    }

    return {
      success: result.status === 'done',
      videoJobId: job.id,
      status: result.status,
      videoUrl: result.videoUrl,
    };
  }
}
