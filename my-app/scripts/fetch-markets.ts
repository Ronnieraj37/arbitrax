#!/usr/bin/env npx tsx
/**
 * Fetch Polymarket Bitcoin Up/Down market data for backtesting.
 *
 * Usage:
 *   npx tsx scripts/fetch-markets.ts              # Fetch all timeframes
 *   npx tsx scripts/fetch-markets.ts --1h          # Fetch only 1h markets
 *   npx tsx scripts/fetch-markets.ts --1h --count 500  # Fetch 500 1h markets
 *   npx tsx scripts/fetch-markets.ts --incremental  # Fetch only new markets since last run
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  fetchMarkets,
  buildMarketDataFile,
  DEFAULT_COUNTS,
  DAILY_INCREMENTAL,
  type Timeframe,
  type MarketDataFile,
  type FetchProgress,
} from "../lib/market-data";

const DATA_DIR = path.resolve(process.cwd(), "public/data");
const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];

function parseArgs(): { timeframes: Timeframe[]; incremental: boolean; count?: number } {
  const args = process.argv.slice(2);
  const timeframes: Timeframe[] = [];
  let incremental = false;
  let count: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--15m") timeframes.push("15m");
    else if (arg === "--1h") timeframes.push("1h");
    else if (arg === "--4h") timeframes.push("4h");
    else if (arg === "--1d") timeframes.push("1d");
    else if (arg === "--incremental") incremental = true;
    else if (arg === "--count" && args[i + 1]) {
      count = parseInt(args[++i], 10);
    }
  }

  return {
    timeframes: timeframes.length ? timeframes : TIMEFRAMES,
    incremental,
    count,
  };
}

async function loadExisting(timeframe: Timeframe): Promise<MarketDataFile | null> {
  try {
    const filePath = path.join(DATA_DIR, `markets-${timeframe}.json`);
    const data = await readFile(filePath, "utf8");
    return JSON.parse(data) as MarketDataFile;
  } catch {
    return null;
  }
}

function logProgress(p: FetchProgress) {
  const pct = ((p.current / p.total) * 100).toFixed(1);
  process.stdout.write(
    `\r  [${p.timeframe}] ${pct}% (${p.current}/${p.total}) found: ${p.found} skipped: ${p.skipped}   `
  );
}

async function main() {
  const { timeframes, incremental, count } = parseArgs();

  await mkdir(DATA_DIR, { recursive: true });

  console.log("=== Polymarket Market Data Fetcher ===");
  console.log(`Timeframes: ${timeframes.join(", ")}`);
  console.log(`Mode: ${incremental ? "incremental" : "full"}`);
  console.log("");

  for (const tf of timeframes) {
    const existing = await loadExisting(tf);
    const existingEndTs = existing?.range?.endTs ?? undefined;

    let fetchCount: number;
    if (count) {
      fetchCount = count;
    } else if (incremental && existing) {
      fetchCount = DAILY_INCREMENTAL[tf] * 2; // Fetch 2 days worth to be safe
    } else {
      fetchCount = DEFAULT_COUNTS[tf];
    }

    console.log(`\nFetching ${tf} markets (count: ${fetchCount})...`);
    if (existing) {
      console.log(`  Existing data: ${existing.range.markets} markets, latest: ${new Date((existingEndTs ?? 0) * 1000).toISOString()}`);
    }

    const startTime = Date.now();
    const bundles = await fetchMarkets(
      tf,
      fetchCount,
      logProgress,
      incremental ? existingEndTs : undefined
    );

    console.log(""); // newline after progress
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Fetched ${bundles.length} markets in ${elapsed}s`);

    if (!bundles.length && !existing) {
      console.log(`  No data found for ${tf}, skipping file write.`);
      continue;
    }

    const file = buildMarketDataFile(tf, bundles, existing?.markets);
    const filePath = path.join(DATA_DIR, `markets-${tf}.json`);
    await writeFile(filePath, JSON.stringify(file, null, 2), "utf8");
    console.log(`  Wrote ${file.range.markets} total markets to ${filePath}`);
  }

  console.log("\nDone! Market data is ready for backtesting.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exitCode = 1;
});
