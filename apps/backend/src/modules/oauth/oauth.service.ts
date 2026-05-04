import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  accountId?: string;
  accountName?: string;
}

interface PlatformConfig {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  private getPlatformConfig(platform: string): PlatformConfig | null {
    const redirectBase = this.config.get('OAUTH_REDIRECT_BASE', 'http://localhost:4000');

    switch (platform.toUpperCase()) {
      case 'INSTAGRAM':
      case 'FACEBOOK':
        return {
          authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
          tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
          clientId: this.config.get('META_APP_ID', ''),
          clientSecret: this.config.get('META_APP_SECRET', ''),
          scopes: [
            'instagram_basic',
            'instagram_content_publish',
            'instagram_manage_insights',
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_posts',
          ],
        };
      case 'LINKEDIN':
        return {
          authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
          tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
          clientId: this.config.get('LINKEDIN_CLIENT_ID', ''),
          clientSecret: this.config.get('LINKEDIN_CLIENT_SECRET', ''),
          scopes: ['openid', 'profile', 'w_member_social'],
        };
      case 'TIKTOK':
        return {
          authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
          tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
          clientId: this.config.get('TIKTOK_CLIENT_KEY', ''),
          clientSecret: this.config.get('TIKTOK_CLIENT_SECRET', ''),
          scopes: ['video.publish', 'video.upload', 'user.info.basic'],
        };
      case 'X':
        return {
          authUrl: 'https://twitter.com/i/oauth2/authorize',
          tokenUrl: 'https://api.twitter.com/2/oauth2/token',
          clientId: this.config.get('X_CLIENT_ID', ''),
          clientSecret: this.config.get('X_CLIENT_SECRET', ''),
          scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        };
      default:
        return null;
    }
  }

  /**
   * Build the authorization URL that the user will be redirected to
   */
  getAuthorizationUrl(platform: string, clientId: string, state: string): string | null {
    const cfg = this.getPlatformConfig(platform);
    if (!cfg || !cfg.clientId) return null;

    const redirectUri = this.getRedirectUri(platform);
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes.join(platform.toUpperCase() === 'TIKTOK' ? ',' : ' '),
      state: `${clientId}:${state}`,
    });

    // TikTok uses a slightly different param name
    if (platform.toUpperCase() === 'TIKTOK') {
      params.set('client_key', cfg.clientId);
      params.delete('client_id');
    }

    return `${cfg.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(platform: string, code: string): Promise<OAuthTokenResponse | null> {
    const cfg = this.getPlatformConfig(platform);
    if (!cfg) return null;

    const redirectUri = this.getRedirectUri(platform);

    try {
      const body: Record<string, string> = {
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      };

      // TikTok uses client_key instead
      if (platform.toUpperCase() === 'TIKTOK') {
        body.client_key = cfg.clientId;
        delete body.client_id;
      }

      const response = await fetch(cfg.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Token exchange failed for ${platform}:`, data);
        return null;
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      this.logger.error(`Token exchange error for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Save OAuth tokens encrypted in the database
   */
  async saveTokens(
    clientId: string,
    platform: string,
    tokens: OAuthTokenResponse,
  ): Promise<void> {
    const encryptedAccess = this.encryption.encrypt(tokens.accessToken);
    const encryptedRefresh = tokens.refreshToken
      ? this.encryption.encrypt(tokens.refreshToken)
      : null;

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null;

    // Upsert: update if platform account already exists for this client
    const existing = await this.prisma.clientSocialAccount.findFirst({
      where: { clientId, platform: platform.toUpperCase() as any },
    });

    if (existing) {
      await this.prisma.clientSocialAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt,
          accountId: tokens.accountId || existing.accountId,
          accountName: tokens.accountName || existing.accountName,
        },
      });
    } else {
      await this.prisma.clientSocialAccount.create({
        data: {
          clientId,
          platform: platform.toUpperCase() as any,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt,
          accountId: tokens.accountId,
          accountName: tokens.accountName,
        },
      });
    }

    this.logger.log(`OAuth tokens saved for client=${clientId} platform=${platform}`);
  }

  /**
   * Get connected platforms for a client
   */
  async getConnectedPlatforms(clientId: string) {
    const accounts = await this.prisma.clientSocialAccount.findMany({
      where: { clientId },
      select: {
        id: true,
        platform: true,
        accountName: true,
        connectedAt: true,
        tokenExpiresAt: true,
      },
    });

    return accounts.map((a) => ({
      ...a,
      isExpired: a.tokenExpiresAt ? a.tokenExpiresAt < new Date() : false,
    }));
  }

  /**
   * Get connected social accounts for a client (org-scoped)
   */
  async getConnectedAccounts(orgId: string, clientId: string) {
    // Verify client belongs to org
    const client = await this.prisma.client.findFirst({ where: { id: clientId, orgId } });
    if (!client) return [];

    const accounts = await this.prisma.clientSocialAccount.findMany({
      where: { clientId },
      select: { id: true, platform: true, accountId: true, accountName: true, connectedAt: true, tokenExpiresAt: true },
    });

    return accounts.map((a) => ({
      ...a,
      isExpired: a.tokenExpiresAt ? a.tokenExpiresAt < new Date() : false,
    }));
  }

  /**
   * Disconnect a platform (delete tokens)
   */
  async disconnectPlatform(accountId: string): Promise<void> {
    await this.prisma.clientSocialAccount.delete({
      where: { id: accountId },
    });
  }

  /**
   * Get decrypted access token for an account, auto-refreshing if expired
   */
  async getValidAccessToken(accountId: string): Promise<string | null> {
    const account = await this.prisma.clientSocialAccount.findUnique({
      where: { id: accountId },
    });
    if (!account?.accessToken) return null;

    const isExpired = account.tokenExpiresAt ? account.tokenExpiresAt < new Date() : false;
    if (isExpired && account.refreshToken) {
      this.logger.log(`Token expired for account ${accountId}, attempting refresh...`);
      const refreshed = await this.refreshToken(account);
      if (refreshed) return refreshed;
    }

    return this.encryption.decrypt(account.accessToken);
  }

  /**
   * Refresh a Meta (Instagram/Facebook) long-lived token.
   * Other platforms: LinkedIn tokens last 60 days (manual reauth required).
   * X (Twitter): uses OAuth 2.0 refresh_token grant.
   */
  private async refreshToken(account: any): Promise<string | null> {
    const platform = account.platform as string;

    try {
      if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
        // Meta: exchange for new long-lived token (valid 60 days)
        const appId = this.config.get('META_APP_ID');
        const appSecret = this.config.get('META_APP_SECRET');
        if (!appId || !appSecret) return null;

        const currentToken = this.encryption.decrypt(account.accessToken);
        const response = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`,
        );
        const data = await response.json();

        if (data.access_token) {
          const newToken = this.encryption.encrypt(data.access_token);
          const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days default

          await this.prisma.clientSocialAccount.update({
            where: { id: account.id },
            data: { accessToken: newToken, tokenExpiresAt: expiresAt },
          });

          this.logger.log(`Meta token refreshed for account ${account.id}, expires: ${expiresAt.toISOString()}`);
          return data.access_token;
        }
      } else if (platform === 'X') {
        // X OAuth 2.0 refresh_token grant
        const clientId = this.config.get('X_CLIENT_ID');
        const clientSecret = this.config.get('X_CLIENT_SECRET');
        if (!clientId || !clientSecret || !account.refreshToken) return null;

        const refreshToken = this.encryption.decrypt(account.refreshToken);
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
        });
        const data = await response.json();

        if (data.access_token) {
          const newAccess = this.encryption.encrypt(data.access_token);
          const newRefresh = data.refresh_token ? this.encryption.encrypt(data.refresh_token) : account.refreshToken;
          const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : null;

          await this.prisma.clientSocialAccount.update({
            where: { id: account.id },
            data: { accessToken: newAccess, refreshToken: newRefresh, tokenExpiresAt: expiresAt },
          });

          this.logger.log(`X token refreshed for account ${account.id}`);
          return data.access_token;
        }
      }
    } catch (err) {
      this.logger.error(`Token refresh failed for account ${account.id} (${platform}):`, err);
    }

    return null;
  }

  /**
   * Cron: daily check — warn about tokens expiring in 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async auditExpiringTokens(): Promise<void> {
    const warningThreshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const expiring = await this.prisma.clientSocialAccount.findMany({
      where: {
        tokenExpiresAt: { lte: warningThreshold, gte: new Date() },
      },
      include: { client: true },
    });

    if (expiring.length > 0) {
      this.logger.warn(
        `⚠️  ${expiring.length} social account token(s) expiring within 7 days: ` +
        expiring.map((a) => `${a.client?.name} / ${a.platform}`).join(', '),
      );
    }
  }

  private getRedirectUri(platform: string): string {
    const base = this.config.get('OAUTH_REDIRECT_BASE', 'http://localhost:4000');
    return `${base}/api/v1/oauth/${platform.toLowerCase()}/callback`;
  }
}
