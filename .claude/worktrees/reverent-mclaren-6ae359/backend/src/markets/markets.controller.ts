import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(private readonly markets: MarketsService) {}

  @Get('history')
  async history(
    @Query('timeframe') timeframe?: string,
    @Query('days') days?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tf = (
      ['15m', '1h', '4h', '1d'].includes(String(timeframe)) ? timeframe : '15m'
    ) as '15m' | '1h' | '4h' | '1d';
    const daysNum = days ? parseInt(days, 10) : 60;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    if (Number.isNaN(daysNum) || daysNum <= 0 || daysNum > 120)
      throw new BadRequestException('Invalid days');
    if (Number.isNaN(limitNum) || limitNum <= 0 || limitNum > 200)
      throw new BadRequestException('Invalid limit');
    if (Number.isNaN(offsetNum) || offsetNum < 0)
      throw new BadRequestException('Invalid offset');
    const st =
      status === 'active' || status === 'resolved' || status === 'all'
        ? status
        : 'active';

    return await this.markets.listMarkets({
      timeframe: tf,
      days: daysNum,
      status: st,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  @Get('market')
  async market(@Query('slug') slug?: string) {
    if (!slug) throw new BadRequestException('Missing slug');
    return await this.markets.getMarket(slug);
  }

  @Get('prices-history')
  async pricesHistory(
    @Query('tokenId') tokenId?: string,
    @Query('startTs') startTs?: string,
    @Query('endTs') endTs?: string,
  ) {
    if (!tokenId) throw new BadRequestException('Missing tokenId');
    const s = startTs ? parseInt(startTs, 10) : NaN;
    const e = endTs ? parseInt(endTs, 10) : NaN;
    if (
      !Number.isFinite(s) ||
      !Number.isFinite(e) ||
      s <= 0 ||
      e <= 0 ||
      e <= s
    ) {
      throw new BadRequestException('Invalid startTs/endTs');
    }
    return await this.markets.getPricesHistory(tokenId, s, e);
  }
}
