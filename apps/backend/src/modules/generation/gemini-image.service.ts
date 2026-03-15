import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeneratedImage {
  base64: string;
  mimeType: string;
  prompt: string;
}

@Injectable()
export class GeminiImageService {
  private readonly logger = new Logger(GeminiImageService.name);
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent';

  constructor(private config: ConfigService) {}

  /**
   * Generate an image from a text prompt using Gemini
   */
  async generateImage(prompt: string): Promise<GeneratedImage | null> {
    const apiKey = this.config.get('GEMINI_API_KEY', '');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set, skipping image generation');
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Gemini image generation failed:', data);
        return null;
      }

      // Find the image part in the response
      const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (!imagePart) {
        this.logger.warn('No image in Gemini response');
        return null;
      }

      return {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        prompt,
      };
    } catch (error) {
      this.logger.error('Gemini image generation error:', error);
      return null;
    }
  }

  /**
   * Build an image prompt from content piece context
   */
  buildImagePrompt(params: {
    brief: string;
    clientName: string;
    industry: string;
    toneOfVoice?: string;
    primaryColor?: string;
    contentType: string;
    caption?: string;
  }): string {
    const { brief, clientName, industry, toneOfVoice, primaryColor, contentType, caption } = params;

    const styleHint = toneOfVoice?.toLowerCase().includes('profesional')
      ? 'clean, corporate, professional photography style'
      : 'vibrant, engaging, social media optimized';

    const colorHint = primaryColor
      ? `with color palette inspired by ${primaryColor}`
      : '';

    const typeHint =
      contentType === 'STORY'
        ? 'vertical 9:16 format, mobile-first'
        : contentType === 'REEL'
          ? 'dynamic, motion-suggesting composition, vertical format'
          : 'square 1:1 format, eye-catching';

    return [
      `Create a high-quality social media image for ${clientName}, a ${industry} brand.`,
      caption ? `Context: ${caption.slice(0, 150)}` : `Brief: ${brief.slice(0, 150)}`,
      `Style: ${styleHint} ${colorHint}.`,
      `Format: ${typeHint}.`,
      'No text overlays. No logos. Photorealistic or illustration, whichever fits better.',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
