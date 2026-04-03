import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /**
   * GET /api/v1/admin/config-status
   * Returns which integrations are configured and which env vars are needed
   */
  @Get('config-status')
  getConfigStatus() {
    return this.admin.getConfigStatus();
  }

  /**
   * GET /api/v1/admin/summary
   * Quick summary: how many services are configured vs missing
   */
  @Get('summary')
  getSummary() {
    return this.admin.getSummary();
  }
}
