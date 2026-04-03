import { Controller, Get, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live() {
    return {
      statusCode: HttpStatus.OK,
      ...this.healthService.getLiveness(),
    };
  }

  @Get('ready')
  async ready() {
    return {
      statusCode: HttpStatus.OK,
      ...(await this.healthService.getReadiness()),
    };
  }
}
