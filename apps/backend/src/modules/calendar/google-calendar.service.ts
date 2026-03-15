import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/encryption.service';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Build Google OAuth authorization URL
   */
  getAuthorizationUrl(orgId: string, state: string): string | null {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
    if (!clientId) return null;

    const redirectUri = this.getRedirectUri();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: `${orgId}:${state}`,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<GoogleTokens | null> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', '');
    const redirectUri = this.getRedirectUri();

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error('Google token exchange failed:', data);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('Google token exchange error:', error);
      return null;
    }
  }

  /**
   * Save Google Calendar tokens encrypted in OrgApiKey
   */
  async saveTokens(orgId: string, tokens: GoogleTokens): Promise<void> {
    const tokenData = JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });

    const encrypted = this.encryption.encrypt(tokenData);

    await this.prisma.orgApiKey.upsert({
      where: { orgId_provider: { orgId, provider: 'google_calendar' } },
      update: {
        encryptedKey: encrypted,
        label: 'Google Calendar conectado',
      },
      create: {
        orgId,
        provider: 'google_calendar',
        encryptedKey: encrypted,
        label: 'Google Calendar conectado',
      },
    });

    this.logger.log(`Google Calendar tokens saved for org=${orgId}`);
  }

  /**
   * Check if Google Calendar is connected for an org
   */
  async isConnected(orgId: string): Promise<boolean> {
    const key = await this.prisma.orgApiKey.findUnique({
      where: { orgId_provider: { orgId, provider: 'google_calendar' } },
    });
    return !!key;
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(orgId: string): Promise<void> {
    await this.prisma.orgApiKey.deleteMany({
      where: { orgId, provider: 'google_calendar' },
    });
  }

  /**
   * Get a valid access token (refresh if expired)
   */
  private async getAccessToken(orgId: string): Promise<string | null> {
    const key = await this.prisma.orgApiKey.findUnique({
      where: { orgId_provider: { orgId, provider: 'google_calendar' } },
    });

    if (!key) return null;

    const decrypted = this.encryption.decrypt(key.encryptedKey);
    const tokenData = JSON.parse(decrypted);

    // Check if token is expired (with 5 min buffer)
    if (tokenData.expiresAt < Date.now() + 5 * 60 * 1000) {
      return this.refreshAccessToken(orgId, tokenData.refreshToken);
    }

    return tokenData.accessToken;
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(orgId: string, refreshToken: string): Promise<string | null> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', '');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error('Google token refresh failed:', data);
        return null;
      }

      // Update stored tokens
      const tokenData = JSON.stringify({
        accessToken: data.access_token,
        refreshToken: refreshToken, // Keep original refresh token
        expiresAt: Date.now() + data.expires_in * 1000,
      });

      const encrypted = this.encryption.encrypt(tokenData);
      await this.prisma.orgApiKey.update({
        where: { orgId_provider: { orgId, provider: 'google_calendar' } },
        data: { encryptedKey: encrypted },
      });

      return data.access_token;
    } catch (error) {
      this.logger.error('Google token refresh error:', error);
      return null;
    }
  }

  /**
   * Create a Google Calendar event when content is scheduled
   */
  async createEvent(
    orgId: string,
    summary: string,
    description: string,
    scheduledAt: Date,
  ): Promise<{ eventId: string } | null> {
    const accessToken = await this.getAccessToken(orgId);
    if (!accessToken) {
      this.logger.warn(`No Google Calendar token for org=${orgId}, skipping event creation`);
      return null;
    }

    // Event lasts 30 minutes by default
    const endTime = new Date(scheduledAt.getTime() + 30 * 60 * 1000);

    const event = {
      summary,
      description,
      start: {
        dateTime: scheduledAt.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      colorId: '9', // Blueberry color in Google Calendar
    };

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        this.logger.error('Google Calendar event creation failed:', data);
        return null;
      }

      this.logger.log(`Google Calendar event created: ${data.id}`);
      return { eventId: data.id };
    } catch (error) {
      this.logger.error('Google Calendar event creation error:', error);
      return null;
    }
  }

  private getRedirectUri(): string {
    const base = this.config.get('OAUTH_REDIRECT_BASE', 'http://localhost:4000');
    return `${base}/api/v1/oauth/google-calendar/callback`;
  }
}
