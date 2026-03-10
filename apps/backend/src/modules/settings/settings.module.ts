import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { OrganizationController } from './organization.controller';

@Module({
  controllers: [ApiKeysController, OrganizationController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class SettingsModule {}
