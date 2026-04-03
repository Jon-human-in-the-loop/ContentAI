import { Controller, Get, Post, Delete, Query, Param, Body, Request, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CalendarService } from './calendar.service';
import { GoogleCalendarService } from './google-calendar.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('calendar')
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async getCalendar(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('clientId') clientId?: string,
  ) {
    const orgId = req.user.orgId;
    return this.calendarService.getCalendarView(
      orgId,
      new Date(start),
      new Date(end),
      clientId,
    );
  }

  @Post('schedule')
  async schedule(
    @Request() req,
    @Body()
    body: {
      contentPieceId: string;
      scheduledAt: string;
      platform: string;
      socialAccountId: string;
    },
  ) {
    const orgId = req.user.orgId;
    const result = await this.calendarService.schedulePiece(
      orgId,
      body.contentPieceId,
      new Date(body.scheduledAt),
      body.platform,
      body.socialAccountId,
    );

    // Export to Google Calendar if connected
    try {
      await this.googleCalendar.createEvent(
        orgId,
        `ContentAI: ${body.platform} publicación`,
        `Pieza programada para ${body.platform}`,
        new Date(body.scheduledAt),
      );
    } catch (err) {
      this.logger.warn('Google Calendar export failed (non-blocking):', err);
    }

    return result;
  }

  @Delete('schedule/:pieceId')
  async unschedule(@Request() req, @Param('pieceId') pieceId: string) {
    const orgId = req.user.orgId;
    return this.calendarService.unschedulePiece(orgId, pieceId);
  }

  // ── Google Calendar OAuth ──────────────────────────────────

  @Get('google/status')
  async googleStatus(@Request() req) {
    const orgId = req.user.orgId;
    const connected = await this.googleCalendar.isConnected(orgId);
    return { connected };
  }

  @Get('google/authorize')
  googleAuthorize(@Request() req, @Res() res: Response) {
    const orgId = req.user.orgId;
    const state = Math.random().toString(36).substring(2, 15);

    const authUrl = this.googleCalendar.getAuthorizationUrl(orgId, state);

    if (!authUrl) {
      return res.status(400).json({
        message: 'Google Calendar no está configurado. Verificá GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.',
      });
    }

    this.logger.log(`Redirecting to Google Calendar OAuth for org ${orgId}`);
    return res.redirect(authUrl);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    if (error) {
      this.logger.warn(`Google Calendar OAuth error: ${error}`);
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=google-calendar`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=google-calendar&reason=missing_params`);
    }

    const [orgId] = state.split(':');

    const tokens = await this.googleCalendar.exchangeCode(code);
    if (!tokens) {
      return res.redirect(`${frontendUrl}?settings=true&oauth=error&platform=google-calendar&reason=token_exchange_failed`);
    }

    await this.googleCalendar.saveTokens(orgId, tokens);

    this.logger.log(`Google Calendar connected for org ${orgId}`);
    return res.redirect(`${frontendUrl}?settings=true&oauth=success&platform=google-calendar`);
  }

  @Delete('google/disconnect')
  async googleDisconnect(@Request() req) {
    const orgId = req.user.orgId;
    await this.googleCalendar.disconnect(orgId);
    return { disconnected: true };
  }
}
