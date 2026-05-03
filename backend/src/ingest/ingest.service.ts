import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import fs from 'node:fs';
import path from 'node:path';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';

type Timeframe = '15m' | '1h' | '4h' | '1d';
type Asset = 'BTC' | 'ETH';

type PricePoint = { t: number; p: number };
type JsonMarket = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  tokens?: {
    yes?: { tokenId?: string } | null;
    no?: { tokenId?: string } | null;
  } | null;
  yesTokenHistory?: { history: PricePoint[] } | null;
};

const DATA_DIR = path.resolve(process.cwd(), '..', 'my-app', 'public', 'data');

function tfToEnum(tf: Timeframe) {
  if (tf === '15m') return 'M15';
  if (tf === '1h') return 'H1';
  if (tf === '4h') return 'H4';
  return 'D1';
}

function parseFilename(file: string): { tf: Timeframe; asset: Asset } | null {
  // expected: last-15m-markets.json or last-15m-markets-eth.json
  const m = file.match(/^last-(15m|1h|4h|1d)-markets(-eth)?\.json$/);
  if (!m) return null;
  const tf = m[1] as Timeframe;
  const asset: Asset = m[2] ? 'ETH' : 'BTC';
  return { tf, asset };
}

@Injectable()
export class IngestService implements OnModuleInit {
  private readonly log = new Logger(IngestService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Kick off an initial ingestion shortly after boot (non-blocking).
    setTimeout(() => {
      this.ingestAll().catch(() => undefined);
    }, 3000);
  }

  // every 10 minutes
  @Interval(10 * 60 * 1000)
  async interval() {
    await this.ingestAll();
  }

  async ingestAll() {
    if (this.running) return;
    this.running = true;
    try {
      const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const info = parseFilename(f);
        if (!info) continue;
        await this.ingestFile(path.join(DATA_DIR, f), info.asset, info.tf);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`ingestAll failed: ${msg}`);
    } finally {
      this.running = false;
    }
  }

  private async ingestFile(filePath: string, asset: Asset, tf: Timeframe) {
    this.log.log(`Ingesting ${path.basename(filePath)} (${asset} ${tf})`);

    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter: 'markets' }),
      streamArray(),
    ]);

    let processed = 0;
    for await (const chunk of pipeline as any) {
      const m = chunk.value as JsonMarket;
      processed += 1;

      if (!m?.slug || !m.startTs || !m.endTs) continue;

      const yesTokenId = m.tokens?.yes?.tokenId ?? null;
      const noTokenId = m.tokens?.no?.tokenId ?? null;

      const market = await this.prisma.market.upsert({
        where: { slug: m.slug },
        create: {
          slug: m.slug,
          asset,
          timeframe: tfToEnum(tf) as any,
          title: m.title ?? undefined,
          startTs: m.startTs,
          endTs: m.endTs,
          yesTokenId: yesTokenId ?? undefined,
          noTokenId: noTokenId ?? undefined,
        },
        update: {
          asset,
          timeframe: tfToEnum(tf) as any,
          title: m.title ?? undefined,
          startTs: m.startTs,
          endTs: m.endTs,
          yesTokenId: yesTokenId ?? undefined,
          noTokenId: noTokenId ?? undefined,
        },
      });

      const hist = m.yesTokenHistory?.history ?? [];
      if (yesTokenId && hist.length) {
        // batch points (createMany with skipDuplicates relies on @@unique(tokenId,t))
        const batchSize = 5000;
        for (let i = 0; i < hist.length; i += batchSize) {
          const batch = hist.slice(i, i + batchSize).map((pt) => ({
            marketId: market.id,
            tokenId: yesTokenId,
            t: pt.t,
            p: pt.p,
          }));
          await this.prisma.tokenPricePoint.createMany({
            data: batch,
            skipDuplicates: true,
          });
        }

        // minimal features
        let minYes = Infinity;
        let maxYes = -Infinity;
        let endYes = hist[hist.length - 1]?.p ?? null;
        for (const pt of hist) {
          if (pt.p < minYes) minYes = pt.p;
          if (pt.p > maxYes) maxYes = pt.p;
        }
        await this.prisma.marketFeature.upsert({
          where: { marketId: market.id },
          create: {
            marketId: market.id,
            minYes: Number.isFinite(minYes) ? minYes : null,
            maxYes: Number.isFinite(maxYes) ? maxYes : null,
            endYes,
          },
          update: {
            minYes: Number.isFinite(minYes) ? minYes : null,
            maxYes: Number.isFinite(maxYes) ? maxYes : null,
            endYes,
          },
        });
      }

      if (processed % 50 === 0) {
        this.log.log(`...${path.basename(filePath)} processed ${processed}`);
      }
    }

    this.log.log(`Done ${path.basename(filePath)} processed=${processed}`);
  }
}
