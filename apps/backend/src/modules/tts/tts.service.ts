import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';

export type TtsProvider = 'google' | 'elevenlabs' | 'none';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private provider: TtsProvider = 'none';

  constructor(
    private config: ConfigService,
    private storage: StorageService,
  ) {
    if (config.get('GOOGLE_TTS_API_KEY') || config.get('GOOGLE_APPLICATION_CREDENTIALS')) {
      this.provider = 'google';
      this.logger.log('TTS provider: Google Cloud TTS');
    } else if (config.get('ELEVENLABS_API_KEY')) {
      this.provider = 'elevenlabs';
      this.logger.log('TTS provider: ElevenLabs');
    } else {
      this.logger.warn('TTS not configured — set GOOGLE_TTS_API_KEY or ELEVENLABS_API_KEY to enable audio generation');
    }
  }

  isConfigured(): boolean {
    return this.provider !== 'none';
  }

  getProvider(): TtsProvider {
    return this.provider;
  }

  /**
   * Convert text/script to an audio file and upload to S3.
   * Returns the public URL of the audio file, or null if TTS is not configured.
   */
  async synthesize(params: {
    text: string;
    orgId: string;
    clientId?: string;
    contentPieceId?: string;
    languageCode?: string;  // default: 'es-AR'
    voiceName?: string;     // provider-specific voice ID
    speakingRate?: number;  // 0.25–4.0, default 1.0
  }): Promise<string | null> {
    if (this.provider === 'none') return null;

    try {
      let audioBuffer: Buffer;

      if (this.provider === 'google') {
        audioBuffer = await this.synthesizeGoogle(params);
      } else {
        audioBuffer = await this.synthesizeElevenLabs(params);
      }

      if (!audioBuffer?.length) return null;

      // Upload to S3
      const base64 = audioBuffer.toString('base64');
      const stored = await this.storage.uploadBase64({
        orgId: params.orgId,
        clientId: params.clientId,
        contentPieceId: params.contentPieceId,
        base64,
        mimeType: 'audio/mpeg',
        source: `tts_${this.provider}`,
        metadata: { textLength: params.text.length, voice: params.voiceName || 'default' },
      });

      return stored?.url || null;
    } catch (err) {
      this.logger.error('TTS synthesis failed:', err);
      return null;
    }
  }

  // ── Google Cloud TTS ────────────────────────────────────────────────────────

  private async synthesizeGoogle(params: {
    text: string;
    languageCode?: string;
    voiceName?: string;
    speakingRate?: number;
  }): Promise<Buffer> {
    const apiKey = this.config.get('GOOGLE_TTS_API_KEY');
    const languageCode = params.languageCode || 'es-AR';
    const voiceName = params.voiceName || 'es-AR-Standard-A'; // Female Argentine Spanish

    const body = {
      input: { text: params.text },
      voice: { languageCode, name: voiceName },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: params.speakingRate || 1.0,
        pitch: 0,
      },
    };

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error('Google TTS error:', err);
      return Buffer.alloc(0);
    }

    const data = await response.json();
    return Buffer.from(data.audioContent, 'base64');
  }

  // ── ElevenLabs TTS ──────────────────────────────────────────────────────────

  private async synthesizeElevenLabs(params: {
    text: string;
    voiceName?: string;
  }): Promise<Buffer> {
    const apiKey = this.config.get('ELEVENLABS_API_KEY');
    // Default to Rachel (natural, clear Spanish-friendly voice)
    const voiceId = params.voiceName || this.config.get('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error('ElevenLabs TTS error:', err);
      return Buffer.alloc(0);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── Voice listing helpers ───────────────────────────────────────────────────

  /**
   * Returns recommended Spanish voices for the configured provider
   */
  getRecommendedVoices(): Array<{ id: string; name: string; language: string }> {
    if (this.provider === 'google') {
      return [
        { id: 'es-AR-Standard-A', name: 'Valentina (Estándar)', language: 'es-AR' },
        { id: 'es-AR-Standard-B', name: 'Rodrigo (Estándar)', language: 'es-AR' },
        { id: 'es-AR-Neural2-A', name: 'Valentina (Neural)', language: 'es-AR' },
        { id: 'es-AR-Neural2-B', name: 'Rodrigo (Neural)', language: 'es-AR' },
        { id: 'es-ES-Standard-A', name: 'Sofía (España)', language: 'es-ES' },
        { id: 'es-US-Standard-A', name: 'María (US Spanish)', language: 'es-US' },
      ];
    }
    if (this.provider === 'elevenlabs') {
      return [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Multilingual)', language: 'es' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Multilingual)', language: 'es' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Multilingual)', language: 'es' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Multilingual)', language: 'es' },
      ];
    }
    return [];
  }
}
