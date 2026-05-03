import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByEmail(
    email: string,
    input: { botId?: string; status?: string; limit?: string; offset?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { trades: [], total: 0, limit: 0, offset: 0 };

    const limit = Math.min(parseInt(input.limit ?? '50', 10) || 50, 100);
    const offset = parseInt(input.offset ?? '0', 10) || 0;
    const botId = input.botId || undefined;
    const status = input.status || undefined;

    const where: Record<string, unknown> = {
      userId: user.id,
      ...(botId ? { botId } : {}),
      ...(status ? { status } : {}),
    };

    const [trades, total] = await Promise.all([
      this.prisma.trade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { bot: { select: { name: true } } },
      }),
      this.prisma.trade.count({ where }),
    ]);

    return { trades, total, limit, offset };
  }
}
