import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { NotebookService } from './notebook.service';

@Controller('notebook')
export class NotebookController {
  constructor(private readonly notebookService: NotebookService) {}

  /**
   * POST /api/v1/notebook/:clientId/entries
   */
  @Post(':clientId/entries')
  async createEntry(
    @Request() req,
    @Param('clientId') clientId: string,
    @Body() body: { title: string; content: string; category?: string },
  ) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.notebookService.createEntry(orgId, clientId, body);
  }

  /**
   * GET /api/v1/notebook/:clientId/entries
   */
  @Get(':clientId/entries')
  async getEntries(
    @Request() req,
    @Param('clientId') clientId: string,
    @Query('category') category?: string,
  ) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.notebookService.getEntries(orgId, clientId, category);
  }

  /**
   * PUT /api/v1/notebook/entries/:id
   */
  @Put('entries/:id')
  async updateEntry(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; category?: string },
  ) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.notebookService.updateEntry(orgId, id, body);
  }

  /**
   * DELETE /api/v1/notebook/entries/:id
   */
  @Delete('entries/:id')
  async deleteEntry(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.notebookService.deleteEntry(orgId, id);
  }

  /**
   * GET /api/v1/notebook/:clientId/context
   * Preview the AI context that will be built from notebook entries
   */
  @Get(':clientId/context')
  async getContext(
    @Request() req,
    @Param('clientId') clientId: string,
  ) {
    const context = await this.notebookService.buildContext(clientId);
    return { context };
  }
}
