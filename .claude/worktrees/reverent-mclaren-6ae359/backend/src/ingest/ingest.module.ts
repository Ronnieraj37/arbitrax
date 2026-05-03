import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestService } from './ingest.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [IngestService],
})
export class IngestModule {}
