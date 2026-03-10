import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentRequestDto, UpdateContentPieceDto } from './dto/content.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../common/guards/roles.guard';
// import { Roles } from '../../common/decorators/roles.decorator';

@Controller('content')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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
  // @Roles('OWNER', 'ADMIN')
  async rejectPiece(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.contentService.rejectPiece(orgId, id);
  }
}
