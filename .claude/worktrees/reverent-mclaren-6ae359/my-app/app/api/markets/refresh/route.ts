import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir, stat } from "node:fs/promises";
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
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between refreshes

/** Simple file-based rate limiter — check if any market file was updated recently */
async function isOnCooldown(): Promise<boolean> {
  try {
    const lockPath = path.join(DATA_DIR, ".refresh-lock");
    const s = await stat(lockPath);
    return Date.now() - s.mtimeMs < COOLDOWN_MS;
  } catch {
    return false;
  }
}

async function touchLock(): Promise<void> {
  const lockPath = path.join(DATA_DIR, ".refresh-lock");
  await writeFile(lockPath, new Date().toISOString(), "utf8");
}

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
 * GET /api/markets/refresh — Vercel Cron handler + status check.
 * Vercel crons always call GET. We run the refresh on GET too so the
 * cron defined in vercel.json actually updates data.
 */
export async function GET(request: Request) {
  // If called by Vercel Cron (has the header), do a full refresh
  const isVercelCron =
    request.headers.get("x-vercel-cron") === "true" ||
    request.headers.get("user-agent")?.includes("vercel-cron");

  if (isVercelCron) {
    return doRefresh();
  }

  // Otherwise, return status
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

  return NextResponse.json({ status, onCooldown: await isOnCooldown() });
}

/** Shared refresh logic used by both GET (Vercel Cron) and POST (client) */
async function doRefresh() {
  // Rate limit
  if (await isOnCooldown()) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Already refreshed recently",
    });
  }

  await mkdir(DATA_DIR, { recursive: true });
  await touchLock();

  const results: Record<
    string,
    { fetched: number; total: number; error?: string }
  > = {};

  for (const tf of TIMEFRAMES) {
    try {
      const existing = await loadExisting(tf);
      const existingEndTs = existing?.range?.endTs ?? undefined;
      // Fetch 2 days of incremental buffer
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
    skipped: false,
    updatedAt: new Date().toISOString(),
    results,
  });
}

/**
 * POST /api/markets/refresh — Incremental refresh for all timeframes.
 * Rate-limited to once per 10 minutes. Called by backtest page on load.
 */
export async function POST() {
  return doRefresh();
}
