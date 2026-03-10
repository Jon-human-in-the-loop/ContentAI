import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

// TODO: Replace hardcoded orgId with auth-extracted orgId from JWT when auth is wired
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

@Controller('api/v1/settings/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async saveKey(@Body() body: { provider: string; key: string }) {
    // In production, orgId comes from the authenticated user's JWT
    const orgId = DEFAULT_ORG_ID;
    return this.apiKeysService.saveKey(orgId, body.provider, body.key);
  }

  @Get()
  async getKeys() {
    const orgId = DEFAULT_ORG_ID;
    return this.apiKeysService.getKeys(orgId);
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(@Param('provider') provider: string) {
    const orgId = DEFAULT_ORG_ID;
    await this.apiKeysService.deleteKey(orgId, provider);
  }
}
