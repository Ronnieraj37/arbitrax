import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';

@Module({
  controllers: [BacktestController],
  providers: [BacktestService],
})
export class BacktestModule {}
