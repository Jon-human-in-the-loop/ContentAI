import { Controller, Post, Get, Body, Request } from '@nestjs/common';
import { TtsService } from './tts.service';

@Controller('tts')
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  /** GET /api/v1/tts/status — Check if TTS is configured */
  @Get('status')
  getStatus() {
    return {
      configured: this.tts.isConfigured(),
      provider: this.tts.getProvider(),
      voices: this.tts.getRecommendedVoices(),
    };
  }

  /**
   * POST /api/v1/tts/synthesize
   * Convert a script to audio and return a URL
   */
  @Post('synthesize')
  async synthesize(
    @Request() req,
    @Body() body: {
      text: string;
      contentPieceId?: string;
      clientId?: string;
      voiceName?: string;
      speakingRate?: number;
      languageCode?: string;
    },
  ) {
    if (!this.tts.isConfigured()) {
      return {
        success: false,
        message: 'TTS not configured. Set GOOGLE_TTS_API_KEY or ELEVENLABS_API_KEY.',
      };
    }

    const audioUrl = await this.tts.synthesize({
      text: body.text,
      orgId: req.user.orgId,
      clientId: body.clientId,
      contentPieceId: body.contentPieceId,
      voiceName: body.voiceName,
      speakingRate: body.speakingRate,
      languageCode: body.languageCode,
    });

    if (!audioUrl) {
      return { success: false, message: 'TTS synthesis failed' };
    }

    return { success: true, audioUrl };
  }
}
