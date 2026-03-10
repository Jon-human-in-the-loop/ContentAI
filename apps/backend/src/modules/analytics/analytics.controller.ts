import { Controller, Get, Query, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(@Request() req) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.analyticsService.getDashboard(orgId);
  }

  @Get('costs')
  async getCostHistory(@Request() req, @Query('days') days?: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.analyticsService.getCostHistory(orgId, parseInt(days || '30'));
  }
}
