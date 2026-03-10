import { Controller, Get, Post, Delete, Query, Param, Body, Request } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getCalendar(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('clientId') clientId?: string,
  ) {
    const orgId = req.user?.orgId || 'demo-org';
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
    const orgId = req.user?.orgId || 'demo-org';
    return this.calendarService.schedulePiece(
      orgId,
      body.contentPieceId,
      new Date(body.scheduledAt),
      body.platform,
      body.socialAccountId,
    );
  }

  @Delete('schedule/:pieceId')
  async unschedule(@Request() req, @Param('pieceId') pieceId: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.calendarService.unschedulePiece(orgId, pieceId);
  }
}
