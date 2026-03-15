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
import { CreateContentRequestDto, UpdateContentPieceDto } from './dto/content.dto';

@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly geminiImage: GeminiImageService,
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
   * POST /api/v1/content/pieces/:id/generate-image
   * Generate an AI image for a content piece using Gemini
   */
  @Post('pieces/:id/generate-image')
  async generateImage(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';

    const piece = await this.contentService.getPiece(orgId, id);

    const prompt = this.geminiImage.buildImagePrompt({
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

    return {
      success: true,
      imageBase64: image.base64,
      mimeType: image.mimeType,
      prompt: image.prompt,
    };
  }
}
