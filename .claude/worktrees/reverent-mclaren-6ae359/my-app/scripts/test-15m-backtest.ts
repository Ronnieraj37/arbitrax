/**
 * Test script: Verify backtest matching works correctly for all timeframes.
 * Compares our results against Python-style slug-based matching.
 *
 * Usage: npx tsx scripts/test-15m-backtest.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { analyzeBacktest, type Market, type MarketType } from "../lib/backtest";

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.resolve(
  ROOT,
  "../DOWN-Strategy_BITSTAMP_BTCUSD_2026-03-06.csv"
);

function main() {
  console.log("=== Backtest Matching Verification ===\n");

  // 1. Load CSV
  let csvText: string;
  try {
    csvText = readFileSync(CSV_PATH, "utf8");
    const lines = csvText.trim().split(/\r?\n/);
    console.log(`CSV: ${path.basename(CSV_PATH)}`);
    console.log(
      `  Lines: ${lines.length} (${Math.floor((lines.length - 1) / 2)} trade pairs)`
    );
    console.log();
  } catch (err) {
    console.error("Failed to load CSV:", err);
    process.exit(1);
  }

  // 2. Load market data for each timeframe
  const timeframes = ["15m", "1h", "4h", "1d"] as const;
  const allMarkets: Market[] = [];

  for (const tf of timeframes) {
    const filePath = path.join(ROOT, `public/data/markets-${tf}.json`);
    try {
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      const mks = (data.markets ?? []).map((m: Market) => ({
        ...m,
        sourceTimeframe: tf,
      }));
      allMarkets.push(...mks);
      console.log(`  ${tf.toUpperCase()}: ${mks.length} markets`);
    } catch {
      console.log(`  ${tf.toUpperCase()}: no data`);
    }
  }
  console.log(`  Total: ${allMarkets.length} markets\n`);

  // 3. Run backtest for each timeframe individually
  console.log("--- Per-timeframe results ---");
  for (const tf of timeframes) {
    const tfMarkets = allMarkets.filter((m) => m.sourceTimeframe === tf);
    if (!tfMarkets.length) {
      console.log(`  ${tf.toUpperCase()}: no data`);
      continue;
    }
    const report = analyzeBacktest({
      tradesCsv: csvText,
      markets: tfMarkets,
      marketType: tf as MarketType,
      stakeUsd: 10,
    });
    console.log(
      `  ${tf.toUpperCase()}: ${report.summary.trades} matched, ` +
        `${(report.summary.winRate * 100).toFixed(1)}% win rate, ` +
        `PnL: ${report.summary.totalPnl.toFixed(3)} tokens`
    );
  }

  // 4. Run with "all" (slug-based matching tries each tf in order)
  const reportAll = analyzeBacktest({
    tradesCsv: csvText,
    markets: allMarkets,
    marketType: "all" as MarketType,
    stakeUsd: 10,
  });

  console.log(
    `\n  ALL: ${reportAll.summary.trades} matched, ` +
      `${(reportAll.summary.winRate * 100).toFixed(1)}% win rate, ` +
      `PnL: ${reportAll.summary.totalPnl.toFixed(3)} tokens`
  );

  // Show timeframe breakdown within "all"
  console.log("\n  Timeframe breakdown (ALL mode):");
  for (const tfa of reportAll.timeframeAnalysis) {
    console.log(
      `    ${tfa.timeframe.toUpperCase()}: ${tfa.trades} trades, ` +
        `${(tfa.winRate * 100).toFixed(1)}% WR, PnL: ${tfa.totalPnl.toFixed(3)}`
    );
  }

  // 5. Resolution quality check
  console.log("\n--- Resolution quality check (1H markets) ---");
  const data1h = JSON.parse(
    readFileSync(path.join(ROOT, "public/data/markets-1h.json"), "utf8")
  );
  let cleanUp = 0,
    cleanDown = 0,
    ambiguous = 0;
  for (const m of data1h.markets) {
    const h = m.yesTokenHistory?.history ?? [];
    if (!h.length) continue;
    const lastP = h[h.length - 1].p;
    if (lastP > 0.95) cleanUp++;
    else if (lastP < 0.05) cleanDown++;
    else ambiguous++;
  }
  console.log(`  Clean UP (>0.95):    ${cleanUp}`);
  console.log(`  Clean DOWN (<0.05):  ${cleanDown}`);
  console.log(`  Ambiguous (0.05-0.95): ${ambiguous}`);
  console.log(
    `  ${((ambiguous / (cleanUp + cleanDown + ambiguous)) * 100).toFixed(1)}% ambiguous`
  );

  // 6. Show sample matched trades
  if (reportAll.matched.length > 0) {
    console.log("\n--- Sample matched trades (first 10) ---");
    for (const t of reportAll.matched.slice(0, 10)) {
      const dt = new Date(t.dtUtc * 1000).toISOString().slice(0, 19);
      console.log(
        `  ${dt} | ${t.dir} | ${t.marketTimeframe} | ${t.slug.slice(-25)} | ` +
          `entry=${(t.startPrice * 100).toFixed(1)}¢ | ` +
          `resolved=${t.yesStart > 0 ? (t.endPrice > 0.5 ? "YES" : "NO") : "?"} | ` +
          `result=${t.result} | pnl=${t.tokenPnl.toFixed(3)}`
      );
    }
  }

  console.log("\n=== DONE ===");
}

main();
