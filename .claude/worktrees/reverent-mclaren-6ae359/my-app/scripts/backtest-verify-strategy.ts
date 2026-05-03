import { readFileSync } from "node:fs";
import path from "node:path";
import { analyzeBacktest, type Market } from "../lib/backtest";

const ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..");
const CSV_PATH = path.join(REPO_ROOT, "Strategy.csv");
const RESULTS_PATH = path.join(REPO_ROOT, "Results.txt");

function readMarkets(): Market[] {
  const tfs = ["15m", "1h", "4h", "1d"] as const;
  const out: Market[] = [];
  for (const tf of tfs) {
    const file = path.join(ROOT, `public/data/last-${tf}-markets.json`);
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    const mks = (data.markets ?? []).map((m: Market) => ({ ...m, sourceTimeframe: tf }));
    out.push(...mks);
  }
  return out;
}

function parseExpected(resultsTxt: string) {
  const matched = /(\d+)\s+signals\s+→\s+(\d+)\s+matched/i.exec(resultsTxt);
  const wr = /Win rate\s+([0-9.]+)%/i.exec(resultsTxt.replace(/\n/g, " "));
  const roi = /ROI\s+([0-9.\-]+)%/i.exec(resultsTxt.replace(/\n/g, " "));
  return {
    signals: matched ? Number(matched[1]) : null,
    matched: matched ? Number(matched[2]) : null,
    winRatePct: wr ? Number(wr[1]) : null,
    roiPct: roi ? Number(roi[1]) : null,
  };
}

function main() {
  const csv = readFileSync(CSV_PATH, "utf8");
  const results = readFileSync(RESULTS_PATH, "utf8");
  const expected = parseExpected(results);
  const markets = readMarkets();

  const report = analyzeBacktest({
    tradesCsv: csv,
    markets,
    marketType: "all",
    stakeUsd: 10,
    config: {
      csvTimeframe: "15m",
      asset: "BTC",
      stakeUsd: 10,
      timestampsAreUtc: true,
      processOrdersOnClose: true,
      allowMultipleEntriesSameMarket: true,
      oppositeSignalMode: "flip-side",
    },
  });

  const actual = {
    signals: report.signalCount,
    matched: report.summary.trades,
    winRatePct: Number((report.summary.winRate * 100).toFixed(1)),
    roiPct: Number((report.summary.totalPnl * 100).toFixed(1)),
  };

  console.log("=== Strategy Evaluation Verification ===");
  console.log("Expected (from Results.txt):", expected);
  console.log("Actual (from evaluator):", actual);
  console.log("Coverage:", report.marketsCoverage);
  console.log(
    "Timeframe breakdown:",
    report.timeframeAnalysis.map((t) => ({
      tf: t.timeframe,
      trades: t.trades,
      wr: Number((t.winRate * 100).toFixed(1)),
      pnl: t.totalPnl,
    })),
  );

  const delta = {
    signals: expected.signals == null ? null : actual.signals - expected.signals,
    matched: expected.matched == null ? null : actual.matched - expected.matched,
    winRatePct:
      expected.winRatePct == null ? null : Number((actual.winRatePct - expected.winRatePct).toFixed(1)),
    roiPct: expected.roiPct == null ? null : Number((actual.roiPct - expected.roiPct).toFixed(1)),
  };
  console.log("Delta:", delta);
}

main();
