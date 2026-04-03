import { Controller, Get, Query, Param, Res, Request, Logger, Inject } from '@nestjs/common';
import { Response } from 'express';
import { OAuthService } from './oauth.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { REDIS_CLIENT } from '../../config/redis.module';
import type { Redis } from 'ioredis';

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * GET /api/v1/oauth/accounts?clientId=xxx
   * List connected social accounts for a client
   */
  @Get('accounts')
  async getAccounts(@Request() req, @Query('clientId') clientId: string) {
    const orgId = req.user.orgId;
    if (!clientId) return [];
    return this.oauthService.getConnectedAccounts(orgId, clientId);
  }

  /**
   * GET /api/v1/oauth/:platform/authorize?clientId=xxx
   * Redirects user to provider's OAuth consent page
   */
  @Get(':platform/authorize')
  authorize(
    @Param('platform') platform: string,
    @Query('clientId') clientId: string,
    @Res() res: Response,
  ) {
    if (!clientId) {
      return res.status(400).json({ message: 'clientId query param is required' });
    }

    // Generate random state for CSRF protection and store in Redis (10 min TTL)
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await this.redis.set(`oauth:state:${state}`, clientId, 'EX', 600);

    const authUrl = this.oauthService.getAuthorizationUrl(platform, clientId, state);

    if (!authUrl) {
      return res.status(400).json({
        message: `Platform "${platform}" is not configured. Check that the required environment variables are set.`,
      });
    }

    this.logger.log(`Redirecting to ${platform} OAuth for client ${clientId}`);
    return res.redirect(authUrl);
  }

  /**
   * GET /api/v1/oauth/:platform/callback?code=xxx&state=clientId:randomState
   * Receives the callback from the OAuth provider
   */
  @Public()
  @Get(':platform/callback')
  async callback(
    @Param('platform') platform: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    if (error) {
      this.logger.warn(`OAuth error for ${platform}: ${error}`);
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=${platform}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=${platform}&reason=missing_params`);
    }

    // Extract and validate state: format is clientId:randomPart
    const colonIdx = state.indexOf(':');
    const randomPart = colonIdx >= 0 ? state.slice(colonIdx + 1) : state;
    const clientId = colonIdx >= 0 ? state.slice(0, colonIdx) : null;

    // Verify state exists in Redis (CSRF protection)
    const storedClientId = await this.redis.get(`oauth:state:${randomPart}`);
    if (!storedClientId || (clientId && storedClientId !== clientId)) {
      this.logger.warn(`OAuth CSRF check failed for ${platform}: invalid or expired state`);
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=${platform}&reason=invalid_state`);
    }
    await this.redis.del(`oauth:state:${randomPart}`);

    const resolvedClientId = storedClientId;

    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(platform, code);

    if (!tokens) {
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=${platform}&reason=token_exchange_failed`);
    }

    // Save encrypted tokens
    await this.oauthService.saveTokens(resolvedClientId, platform, tokens);

    this.logger.log(`OAuth flow completed for ${platform}, client ${resolvedClientId}`);
    return res.redirect(`${frontendUrl}?settings=true&oauth=success&platform=${platform}`);
  }
}
