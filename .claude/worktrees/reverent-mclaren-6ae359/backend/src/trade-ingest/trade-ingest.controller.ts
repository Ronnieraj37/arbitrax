import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type IngestPayload = {
  // Identifiers from KH workflow run
  workflowId?: string;
  executionId?: string;
  runId?: string;
  // Identifier we baked into the template at create-time
  zlabsBotId?: string;
  // Trade details (place-order step output)
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
      process.env.ZLABS_INGEST_HMAC ||
      process.env.NEXTAUTH_SECRET ||
      'zlabs-dev-ingest-secret'
    );
  }

  private verifyHmac(
    raw: string,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const provided = String(
      headers['x-zlabs-signature'] ?? headers['X-Zlabs-Signature'] ?? '',
    ).trim();
    if (!provided) return false;
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(raw)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(provided),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  // Plain bearer-token alternative — easier to template into a KH HTTP node header
  // than a per-request HMAC. Either auth path is accepted.
  private verifyBearer(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const auth = String(headers['authorization'] ?? '').trim();
    if (!auth.toLowerCase().startsWith('bearer ')) return false;
    const token = auth.slice(7).trim();
    return token === this.secret;
  }

  @Post('trade')
  async ingestTrade(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: IngestPayload,
  ) {
    const raw = JSON.stringify(body ?? {});
    const ok = this.verifyBearer(headers) || this.verifyHmac(raw, headers);
    if (!ok) {
      throw new UnauthorizedException(
        'Invalid signature. Provide Authorization: Bearer <ZLABS_INGEST_HMAC> or X-Zlabs-Signature.',
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
    const side = (body.side ?? body.signal ?? 'BUY').toString().toUpperCase();
    const signal = (body.signal ?? body.side ?? 'BUY').toString().toUpperCase();
    const paper = body.paper === true || body.paper === 'true';
    const tokenId = body.tokenId ?? 'unknown';
    const marketSlug = body.marketSlug ?? 'polymarket';

    // Idempotent on keeperhubExecutionId — KH may retry the HTTP node.
    const trade = await this.prisma.trade.upsert({
      where: {
        keeperhubExecutionId: body.executionId ?? `kh_${body.orderId ?? Date.now()}`,
      },
      create: {
        userId: bot.userId,
        botId: bot.id,
        signal: signal === 'SELL' ? 'SELL' : 'BUY',
        side: side === 'SELL' ? 'SELL' : 'BUY',
        direction: signal === 'SELL' ? 'DOWN' : 'UP',
        marketSlug,
        tokenId,
        amount: sizeUsd,
        price,
        status: 'FILLED',
        orderId: body.orderId ?? null,
        executedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
        keeperhubExecutionId:
          body.executionId ?? `kh_${body.orderId ?? Date.now()}`,
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
      `Ingested trade ${trade.id} | bot=${bot.id} | ${side} ${tokenId} $${sizeUsd} @ ${price} | paper=${paper}`,
    );

    return { success: true, tradeId: trade.id };
  }
}
