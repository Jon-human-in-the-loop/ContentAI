import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { CreatifyService } from './creatify.service';
import { StorageModule } from '../storage/storage.module';
import { TtsModule } from '../tts/tts.module';

@Module({
  imports: [StorageModule, TtsModule],
  controllers: [VideoController],
  providers: [CreatifyService],
  exports: [CreatifyService],
})
export class VideoModule {}
