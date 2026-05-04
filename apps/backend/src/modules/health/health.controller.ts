import { Controller, Get, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('live')
  live() {
    return {
      statusCode: HttpStatus.OK,
      ...this.healthService.getLiveness(),
    };
  }

  @Public()
  @Get('ready')
  async ready() {
    return {
      statusCode: HttpStatus.OK,
      ...(await this.healthService.getReadiness()),
    };
  }

  @Public()
  @Get('status')
  async status() {
    return {
      statusCode: HttpStatus.OK,
      ...(await this.healthService.getStatus()),
    };
  }
}
