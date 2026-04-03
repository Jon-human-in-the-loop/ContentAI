import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Controller('settings/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async saveKey(@Request() req, @Body() body: { provider: string; key: string }) {
    return this.apiKeysService.saveKey(req.user.orgId, body.provider, body.key);
  }

  @Get()
  async getKeys(@Request() req) {
    return this.apiKeysService.getKeys(req.user.orgId);
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(@Request() req, @Param('provider') provider: string) {
    await this.apiKeysService.deleteKey(req.user.orgId, provider);
  }
}
