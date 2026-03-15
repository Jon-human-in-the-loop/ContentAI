import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { GeminiImageService } from '../generation/gemini-image.service';
import { AiRouterService } from '../generation/ai-router.service';
import { StorageService } from '../storage/storage.service';
import { CreateContentRequestDto, UpdateContentPieceDto } from './dto/content.dto';

@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly geminiImage: GeminiImageService,
    private readonly aiRouter: AiRouterService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * POST /api/v1/content/requests
   * Create a new content generation request
   */
  @Post('requests')
  // @Roles('OWNER', 'ADMIN', 'EDITOR')
  async createRequest(@Request() req, @Body() dto: CreateContentRequestDto) {
    const orgId = req.user?.orgId || 'demo-org'; // TODO: from JWT
    const userId = req.user?.id || 'demo-user';
    return this.contentService.createRequest(orgId, userId, dto);
  }

  /**
   * GET /api/v1/content/requests
   * List all content requests
   */
  @Get('requests')
  async getRequests(@Request() req, @Query('clientId') clientId?: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.contentService.getRequests(orgId, clientId);
  }

  /**
   * GET /api/v1/content/pieces/:id
   * Get a specific content piece
   */
  @Get('pieces/:id')
  async getPiece(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.contentService.getPiece(orgId, id);
  }

  /**
   * PUT /api/v1/content/pieces/:id
   * Update a content piece
   */
  @Put('pieces/:id')
  // @Roles('OWNER', 'ADMIN', 'EDITOR')
  async updatePiece(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateContentPieceDto,
  ) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.contentService.updatePiece(orgId, id, dto);
  }

  /**
   * PATCH /api/v1/content/pieces/:id/approve
   */
  @Patch('pieces/:id/approve')
  // @Roles('OWNER', 'ADMIN')
  async approvePiece(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.contentService.approvePiece(orgId, id);
  }

  /**
   * PATCH /api/v1/content/pieces/:id/reject
   */
  @Patch('pieces/:id/reject')
  async rejectPiece(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.contentService.rejectPiece(orgId, id);
  }

  /**
   * POST /api/v1/content/pieces/:id/image-prompt
   * Use Claude to generate an optimized image prompt based on the piece context
   */
  @Post('pieces/:id/image-prompt')
  async generateImagePrompt(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    const piece = await this.contentService.getPiece(orgId, id);

    const clientName = piece.client?.name || 'Brand';
    const industry = (piece.client as any)?.industry || '';
    const toneOfVoice = piece.client?.branding?.toneOfVoice || '';
    const primaryColor = piece.client?.branding?.primaryColor || '';
    const caption = piece.caption || '';
    const brief = piece.request?.brief || '';
    const contentType = piece.type;

    const systemPrompt = `You are an expert visual director for social media content. Your job is to write precise, detailed image generation prompts that produce stunning visuals for brands.

Rules:
- Write the prompt in English
- Be specific about composition, lighting, colors, mood, style
- Include the exact aspect ratio: POST/CAROUSEL = square 1:1, STORY = vertical 9:16, REEL = vertical 9:16
- Never include text overlays or logos in the image
- Match the brand's tone and industry
- The prompt should be 2-4 sentences, detailed but concise
- Return ONLY the prompt text, nothing else`;

    const userPrompt = `Generate an image prompt for a ${contentType} for this brand:

Brand: ${clientName}
Industry: ${industry}
Tone: ${toneOfVoice}
Primary color: ${primaryColor}
Brief: ${brief}
Caption: ${caption}

Write the perfect image generation prompt:`;

    try {
      const aiResponse = await this.aiRouter.generate({
        taskType: 'generate:visual_prompt',
        systemPrompt,
        userPrompt,
        maxTokens: 300,
        temperature: 0.9,
      });

      return {
        success: true,
        prompt: aiResponse.content.trim(),
      };
    } catch (error) {
      // Fallback to basic prompt builder if Claude fails
      const fallback = this.geminiImage.buildImagePrompt({
        brief,
        clientName,
        industry,
        toneOfVoice: toneOfVoice || undefined,
        primaryColor: primaryColor || undefined,
        contentType,
        caption: caption || undefined,
      });
      return { success: true, prompt: fallback };
    }
  }

  /**
   * POST /api/v1/content/pieces/:id/generate-image
   * Generate an image using Gemini with a user-provided (or edited) prompt
   */
  @Post('pieces/:id/generate-image')
  async generateImage(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { prompt?: string },
  ) {
    const orgId = req.user?.orgId || 'demo-org';
    const piece = await this.contentService.getPiece(orgId, id);

    // Use the user-provided prompt or fall back to auto-generated
    const prompt = body.prompt || this.geminiImage.buildImagePrompt({
      brief: piece.request?.brief || '',
      clientName: piece.client?.name || 'Brand',
      industry: (piece.client as any)?.industry || '',
      toneOfVoice: piece.client?.branding?.toneOfVoice || undefined,
      primaryColor: piece.client?.branding?.primaryColor || undefined,
      contentType: piece.type,
      caption: piece.caption || undefined,
    });

    const image = await this.geminiImage.generateImage(prompt);

    if (!image) {
      return { success: false, message: 'Image generation failed or GEMINI_API_KEY not configured' };
    }

    // Persist to S3 if configured
    const stored = await this.storageService.uploadBase64({
      orgId,
      clientId: piece.clientId,
      contentPieceId: id,
      base64: image.base64,
      mimeType: image.mimeType,
      source: 'gemini',
      metadata: { prompt },
    });

    return {
      success: true,
      imageBase64: image.base64,
      mimeType: image.mimeType,
      prompt: image.prompt,
      ...(stored ? { assetId: stored.id, imageUrl: stored.url } : {}),
    };
  }

  /**
   * GET /api/v1/content/pieces/:id/media
   * Get all media assets for a content piece
   */
  @Get('pieces/:id/media')
  async getPieceMedia(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.storageService.getAssetsForPiece(orgId, id);
  }
}
