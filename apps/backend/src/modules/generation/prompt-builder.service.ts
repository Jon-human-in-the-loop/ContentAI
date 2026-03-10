import { Injectable } from '@nestjs/common';

interface BrandProfile {
  toneOfVoice?: string;
  styleKeywords?: string[];
  prohibitions?: string[];
  sampleContent?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface GenerationContext {
  clientName: string;
  industry: string;
  brief: string;
  type: string; // POST, REEL, STORY, CAROUSEL
  platform?: string;
  brandProfile: BrandProfile;
  index: number; // For variation
}

@Injectable()
export class PromptBuilderService {
  /**
   * Build the system prompt with brand context
   */
  buildSystemPrompt(ctx: GenerationContext): string {
    const parts = [
      `You are a senior social media content creator specializing in ${ctx.industry || 'general'} brands.`,
      `You create content for the brand "${ctx.clientName}".`,
    ];

    if (ctx.brandProfile?.toneOfVoice) {
      parts.push(`Brand tone of voice: ${ctx.brandProfile.toneOfVoice}`);
    }

    if (ctx.brandProfile?.styleKeywords?.length) {
      parts.push(`Style keywords: ${ctx.brandProfile.styleKeywords.join(', ')}`);
    }

    if (ctx.brandProfile?.prohibitions?.length) {
      parts.push(`NEVER use or mention: ${ctx.brandProfile.prohibitions.join(', ')}`);
    }

    if (ctx.brandProfile?.sampleContent) {
      parts.push(`Example of approved content style:\n"${ctx.brandProfile.sampleContent}"`);
    }

    parts.push(
      'Respond ONLY with the requested content in JSON format.',
      'All content must be in the same language as the brief.',
    );

    return parts.join('\n');
  }

  /**
   * Build the user prompt based on content type
   */
  buildUserPrompt(ctx: GenerationContext): string {
    const typePrompts: Record<string, string> = {
      POST: this.buildPostPrompt(ctx),
      REEL: this.buildReelPrompt(ctx),
      STORY: this.buildStoryPrompt(ctx),
      CAROUSEL: this.buildCarouselPrompt(ctx),
    };

    return typePrompts[ctx.type] || typePrompts.POST;
  }

  /**
   * Get the task type for AI routing
   */
  getTaskType(contentType: string): string {
    const map: Record<string, string> = {
      POST: 'generate:post:caption',
      REEL: 'generate:reel:script',
      STORY: 'generate:story:creative',
      CAROUSEL: 'generate:carousel:narrative',
    };
    return map[contentType] || 'generate:post:caption';
  }

  private buildPostPrompt(ctx: GenerationContext): string {
    return `Brief: ${ctx.brief}

Generate a social media post (variation #${ctx.index + 1}).
${ctx.platform ? `Platform: ${ctx.platform}` : ''}

Respond in this JSON format:
{
  "caption": "The main caption text with emojis where appropriate",
  "hook": "The first line that grabs attention",
  "cta": "Call to action",
  "hashtags": ["hashtag1", "hashtag2", "...up to 15"],
  "visualPrompt": "Description of the ideal image/visual for this post"
}`;
  }

  private buildReelPrompt(ctx: GenerationContext): string {
    return `Brief: ${ctx.brief}

Generate a Reel/Short video script (variation #${ctx.index + 1}).
${ctx.platform ? `Platform: ${ctx.platform}` : ''}

Respond in this JSON format:
{
  "hook": "First 3 seconds - the hook that stops scrolling",
  "script": "Full script with timestamps and visual cues. Format: [00:00] Scene description - Dialogue/text overlay",
  "caption": "Caption for the reel post",
  "cta": "Call to action at the end",
  "hashtags": ["hashtag1", "hashtag2", "...up to 15"],
  "duration": "estimated duration in seconds (15, 30, 60, or 90)",
  "visualPrompt": "Overall visual style and key scenes description"
}`;
  }

  private buildStoryPrompt(ctx: GenerationContext): string {
    return `Brief: ${ctx.brief}

Generate an Instagram/Facebook Story (variation #${ctx.index + 1}).
${ctx.platform ? `Platform: ${ctx.platform}` : ''}

Respond in this JSON format:
{
  "hook": "Opening text that creates curiosity",
  "caption": "Main story text (keep it short, max 2 lines)",
  "cta": "Swipe up / tap action text",
  "hashtags": ["hashtag1", "hashtag2", "...up to 5"],
  "visualPrompt": "Background image/video description for the story",
  "stickerSuggestions": ["poll/quiz/countdown suggestion if relevant"]
}`;
  }

  private buildCarouselPrompt(ctx: GenerationContext): string {
    return `Brief: ${ctx.brief}

Generate a Carousel post with 5-8 slides (variation #${ctx.index + 1}).
${ctx.platform ? `Platform: ${ctx.platform}` : ''}

Respond in this JSON format:
{
  "caption": "Main caption for the carousel post",
  "hook": "Cover slide text that makes people swipe",
  "slides": [
    { "title": "Slide title", "body": "Slide body text", "visualPrompt": "Visual description" }
  ],
  "cta": "Final slide call to action",
  "hashtags": ["hashtag1", "hashtag2", "...up to 15"]
}`;
  }
}
