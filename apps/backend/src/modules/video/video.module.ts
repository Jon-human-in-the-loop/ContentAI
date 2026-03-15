import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { CreatifyService } from './creatify.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [VideoController],
  providers: [CreatifyService],
  exports: [CreatifyService],
})
export class VideoModule {}
