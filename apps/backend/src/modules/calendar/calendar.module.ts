import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, GoogleCalendarService],
  exports: [CalendarService, GoogleCalendarService],
})
export class CalendarModule {}
