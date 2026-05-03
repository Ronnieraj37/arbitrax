import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { requireUserEmail } from '../common/user-email';
import { BacktestService } from './backtest.service';

@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtests: BacktestService) {}

  @Post()
  @UseInterceptors(FileInterceptor('csv'))
  async create(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const email = requireUserEmail(headers);
    if (!file?.buffer?.length)
      throw new BadRequestException('CSV file required');

    // fields come in as headers via Next proxy; keep compatible with existing UI
    return await this.backtests.createByEmail(email, {
      csvText: file.buffer.toString('utf-8'),
      name: (headers['x-backtest-name'] as string) ?? 'Untitled Backtest',
      marketType: (headers['x-backtest-market-type'] as string) ?? 'both',
    });
  }

  @Get()
  async list(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const email = requireUserEmail(headers);
    return await this.backtests.listByEmail(email);
  }
}
