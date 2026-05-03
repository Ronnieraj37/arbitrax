import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  fetchMarkets,
  buildMarketDataFile,
  DEFAULT_COUNTS,
  type Timeframe,
  type MarketDataFile,
} from "@/lib/market-data";

const DATA_DIR = path.resolve(process.cwd(), "public/data");

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const timeframe = body.timeframe as Timeframe;
    const count = body.count as number | undefined;

    if (!["15m", "1h", "4h", "1d"].includes(timeframe)) {
      return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
    }

    await mkdir(DATA_DIR, { recursive: true });

    const existing = await loadExisting(timeframe);
    const fetchCount = count ?? Math.min(DEFAULT_COUNTS[timeframe], 200); // Cap at 200 for API route

    const bundles = await fetchMarkets(timeframe, fetchCount);
    const file = buildMarketDataFile(timeframe, bundles, existing?.markets);

    const filePath = path.join(DATA_DIR, `markets-${timeframe}.json`);
    await writeFile(filePath, JSON.stringify(file, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      timeframe,
      fetched: bundles.length,
      total: file.range.markets,
      dateRange: file.range,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  // Return status of available market data
  const status: Record<string, { markets: number; dateRange: string } | null> =
    {};

  for (const tf of ["15m", "1h", "4h", "1d"] as Timeframe[]) {
    const existing = await loadExisting(tf);
    if (existing) {
      const start = existing.range.startTs
        ? new Date(existing.range.startTs * 1000).toISOString().slice(0, 10)
        : "?";
      const end = existing.range.endTs
        ? new Date(existing.range.endTs * 1000).toISOString().slice(0, 10)
        : "?";
      status[tf] = {
        markets: existing.range.markets,
        dateRange: `${start} to ${end}`,
      };
    } else {
      status[tf] = null;
    }
  }

  return NextResponse.json({ status });
}
