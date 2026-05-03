import { Module } from '@nestjs/common';
import { TradeIngestController } from './trade-ingest.controller';

@Module({
  controllers: [TradeIngestController],
})
export class TradeIngestModule {}
