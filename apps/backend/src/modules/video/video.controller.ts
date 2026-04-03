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
import { TtsService } from '../tts/tts.service';

@Controller('video')
export class VideoController {
  constructor(
    private readonly creatify: CreatifyService,
    private readonly storageService: StorageService,
    private readonly tts: TtsService,
  ) {}

  /** GET /api/v1/video/status */
  @Get('status')
  getStatus() {
    return {
      creatify: { configured: this.creatify.isConfigured() },
      tts: {
        configured: this.tts.isConfigured(),
        provider: this.tts.getProvider(),
        voices: this.tts.getRecommendedVoices(),
      },
    };
  }

  /**
   * POST /api/v1/video/generate
   * Create an avatar video from image + audio URLs.
   * If audioUrl is empty but script is provided, TTS is used automatically.
   */
  @Post('generate')
  async generateVideo(
    @Request() req,
    @Body() body: {
      imageUrl: string;
      audioUrl?: string;
      script?: string;         // if provided and audioUrl is empty, TTS is used
      voiceName?: string;
      modelVersion?: 'aurora_v1' | 'aurora_v1_fast';
      contentPieceId?: string;
      clientId?: string;
    },
  ) {
    if (!this.creatify.isConfigured()) {
      return { success: false, message: 'Creatify API not configured. Set CREATIFY_API_ID and CREATIFY_API_KEY.' };
    }

    // Auto-synthesize audio from script if no audioUrl provided
    let audioUrl = body.audioUrl || '';
    if (!audioUrl && body.script && this.tts.isConfigured()) {
      const synthesized = await this.tts.synthesize({
        text: body.script,
        orgId: req.user.orgId,
        clientId: body.clientId,
        contentPieceId: body.contentPieceId,
        voiceName: body.voiceName,
      });
      if (synthesized) {
        audioUrl = synthesized;
      } else {
        return { success: false, message: 'TTS synthesis failed — audio is required for video generation' };
      }
    }

    if (!audioUrl) {
      return {
        success: false,
        message: this.tts.isConfigured()
          ? 'Provide a script or audioUrl to generate video'
          : 'TTS not configured. Set GOOGLE_TTS_API_KEY or ELEVENLABS_API_KEY, or provide an audioUrl.',
      };
    }

    const result = await this.creatify.createVideo({
      imageUrl: body.imageUrl,
      audioUrl,
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
