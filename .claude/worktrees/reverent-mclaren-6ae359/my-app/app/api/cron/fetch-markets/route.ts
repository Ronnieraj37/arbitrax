import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  fetchMarkets,
  buildMarketDataFile,
  DAILY_INCREMENTAL,
  type Timeframe,
  type MarketDataFile,
} from "@/lib/market-data";

const DATA_DIR = path.resolve(process.cwd(), "public/data");
const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];

async function loadExisting(
  timeframe: Timeframe,
): Promise<MarketDataFile | null> {
  try {
    const filePath = path.join(DATA_DIR, `markets-${timeframe}.json`);
    const data = await readFile(filePath, "utf8");
    return JSON.parse(data) as MarketDataFile;
  } catch {
    return null;
  }
}

/**
 * POST /api/cron/fetch-markets — Incremental market data update.
 * Called by daily cron job. Fetches new markets since last run.
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await mkdir(DATA_DIR, { recursive: true });

  const results: Record<
    string,
    { fetched: number; total: number; error?: string }
  > = {};

  for (const tf of TIMEFRAMES) {
    try {
      const existing = await loadExisting(tf);
      const existingEndTs = existing?.range?.endTs ?? undefined;
      // Fetch 2 days of buffer to catch any gaps
      const fetchCount = DAILY_INCREMENTAL[tf] * 2;

      const bundles = await fetchMarkets(
        tf,
        fetchCount,
        undefined,
        existingEndTs,
      );
      const file = buildMarketDataFile(tf, bundles, existing?.markets);

      const filePath = path.join(DATA_DIR, `markets-${tf}.json`);
      await writeFile(filePath, JSON.stringify(file, null, 2), "utf8");

      results[tf] = { fetched: bundles.length, total: file.range.markets };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results[tf] = { fetched: 0, total: 0, error: msg };
    }
  }

  return NextResponse.json({
    success: true,
    updatedAt: new Date().toISOString(),
    results,
  });
}

/**
 * GET /api/cron/fetch-markets — Check market data status.
 */
export async function GET() {
  const status: Record<
    string,
    { markets: number; startDate: string; endDate: string } | null
  > = {};

  for (const tf of TIMEFRAMES) {
    const existing = await loadExisting(tf);
    if (existing) {
      status[tf] = {
        markets: existing.range.markets,
        startDate: existing.range.startTs
          ? new Date(existing.range.startTs * 1000).toISOString().slice(0, 10)
          : "?",
        endDate: existing.range.endTs
          ? new Date(existing.range.endTs * 1000).toISOString().slice(0, 10)
          : "?",
      };
    } else {
      status[tf] = null;
    }
  }

  return NextResponse.json({
    status,
    generatedAt: new Date().toISOString(),
  });
}
