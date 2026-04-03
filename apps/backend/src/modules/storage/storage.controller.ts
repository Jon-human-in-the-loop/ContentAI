import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * GET /api/v1/storage/assets?clientId=...&pieceId=...
   * List media assets
   */
  @Get('assets')
  async listAssets(
    @Request() req,
    @Query('clientId') clientId?: string,
    @Query('pieceId') pieceId?: string,
  ) {
    const orgId = req.user.orgId;
    if (pieceId) {
      return this.storageService.getAssetsForPiece(orgId, pieceId);
    }
    if (clientId) {
      return this.storageService.getAssetsForClient(orgId, clientId);
    }
    return [];
  }

  /**
   * GET /api/v1/storage/file/:key(*)
   * Serve a file from S3 (proxy)
   */
  @Get('file/*')
  async serveFile(@Request() req, @Res() res: Response) {
    const s3Key = req.params[0];
    const file = await this.storageService.getFile(s3Key);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.set('Content-Type', file.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(file.buffer);
  }

  /**
   * DELETE /api/v1/storage/assets/:id
   */
  @Delete('assets/:id')
  async deleteAsset(@Request() req, @Param('id') id: string) {
    const orgId = req.user.orgId;
    const deleted = await this.storageService.deleteAsset(orgId, id);
    return { success: deleted };
  }
}
