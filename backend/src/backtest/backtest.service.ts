import { ForbiddenException, Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BacktestService {
  constructor(private readonly prisma: PrismaService) {}

  async createByEmail(
    email: string,
    input: { csvText: string; name: string; marketType: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const csvHash = crypto
      .createHash('md5')
      .update(input.csvText)
      .digest('hex');
    const result = await this.prisma.backtestResult.create({
      data: {
        userId: user.id,
        name: input.name ?? 'Untitled Backtest',
        csvHash,
        marketType: input.marketType ?? 'both',
        summary: { raw: true },
      },
    });

    return { id: result.id, csvHash };
  }

  async listByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { results: [] };
    const results = await this.prisma.backtestResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { results };
  }
}
