import { Controller, Get, Query, Param, Res, Request, Logger } from '@nestjs/common';
import { Response } from 'express';
import { OAuthService } from './oauth.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
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

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    // TODO: Store state in Redis for verification in callback

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

    // Extract clientId from state (format: clientId:randomState)
    const [clientId] = state.split(':');
    if (!clientId) {
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=${platform}&reason=invalid_state`);
    }

    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(platform, code);

    if (!tokens) {
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=${platform}&reason=token_exchange_failed`);
    }

    // Save encrypted tokens
    await this.oauthService.saveTokens(clientId, platform, tokens);

    this.logger.log(`OAuth flow completed for ${platform}, client ${clientId}`);
    return res.redirect(`${frontendUrl}?settings=true&oauth=success&platform=${platform}`);
  }
}
