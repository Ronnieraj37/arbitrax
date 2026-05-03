import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type IngestPayload = {
  workflowId?: string;
  executionId?: string;
  runId?: string;
  zlabsBotId?: string;
  tokenId?: string;
  marketSlug?: string;
  side?: 'BUY' | 'SELL';
  signal?: 'BUY' | 'SELL';
  sizeUsd?: number | string;
  price?: number | string;
  paper?: boolean | string;
  orderId?: string;
  submittedAt?: string;
};

@Controller('ingest')
export class TradeIngestController {
  private readonly logger = new Logger(TradeIngestController.name);

  constructor(private readonly prisma: PrismaService) {}

  private get secret(): string {
    return (
      process.env.ZLABS_INGEST_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      'zlabs-dev-ingest-secret'
    );
  }

  private verifyBearer(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const auth = String(headers['authorization'] ?? '').trim();
    if (!auth.toLowerCase().startsWith('bearer ')) return false;
    return auth.slice(7).trim() === this.secret;
  }

  @Post('trade')
  async ingestTrade(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: IngestPayload,
  ) {
    if (!this.verifyBearer(headers)) {
      throw new UnauthorizedException(
        'Invalid Authorization header. Send: Authorization: Bearer <ZLABS_INGEST_SECRET>',
      );
    }

    if (!body?.zlabsBotId) {
      throw new BadRequestException('zlabsBotId required');
    }

    const bot = await this.prisma.bot.findUnique({
      where: { id: body.zlabsBotId },
    });
    if (!bot) throw new BadRequestException('Unknown bot');

    const sizeUsd = Number(body.sizeUsd ?? 0) || 0;
    const price = Number(body.price ?? 0) || 0;
    const sideStr = (body.side ?? body.signal ?? 'BUY').toString().toUpperCase();
    const sigStr = (body.signal ?? body.side ?? 'BUY').toString().toUpperCase();
    const paper = body.paper === true || body.paper === 'true';
    const tokenId = body.tokenId ?? 'unknown';
    const marketSlug = body.marketSlug ?? 'polymarket';
    const execId = body.executionId ?? `kh_${body.orderId ?? Date.now()}`;

    const trade = await this.prisma.trade.upsert({
      where: { keeperhubExecutionId: execId },
      create: {
        userId: bot.userId,
        botId: bot.id,
        signal: sigStr === 'SELL' ? 'SELL' : 'BUY',
        side: sideStr === 'SELL' ? 'SELL' : 'BUY',
        direction: sigStr === 'SELL' ? 'DOWN' : 'UP',
        marketSlug,
        tokenId,
        amount: sizeUsd,
        price,
        status: 'FILLED',
        orderId: body.orderId ?? null,
        executedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
        keeperhubExecutionId: execId,
        keeperhubRunId: body.runId ?? null,
        paper,
      },
      update: {
        status: 'FILLED',
        price,
        amount: sizeUsd,
        executedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
      },
    });

    this.logger.log(
      `Ingested trade ${trade.id} | bot=${bot.id} | ${sideStr} ${tokenId} $${sizeUsd} @ ${price} | paper=${paper}`,
    );

    return { success: true, tradeId: trade.id };
  }
}
