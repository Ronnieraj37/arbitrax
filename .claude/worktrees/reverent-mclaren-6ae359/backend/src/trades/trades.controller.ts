import { Controller, Get, Headers, Query } from '@nestjs/common';
import { requireUserEmail } from '../common/user-email';
import { TradesService } from './trades.service';

@Controller('trades')
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Get()
  async list(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('botId') botId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const email = requireUserEmail(headers);
    return await this.trades.listByEmail(email, {
      botId,
      status,
      limit,
      offset,
    });
  }
}
