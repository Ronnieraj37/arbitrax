import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BotsModule } from './bots/bots.module';
import { TradesModule } from './trades/trades.module';
import { MarketsModule } from './markets/markets.module';
import { BacktestModule } from './backtest/backtest.module';
import { BillingModule } from './billing/billing.module';
import { IngestModule } from './ingest/ingest.module';
import { TradeIngestModule } from './trade-ingest/trade-ingest.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    BotsModule,
    TradesModule,
    MarketsModule,
    BacktestModule,
    BillingModule,
    // market-data poller (existing)
    IngestModule,
    // KeeperHub trade mirror endpoint (POST /v1/ingest/trade)
    TradeIngestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
