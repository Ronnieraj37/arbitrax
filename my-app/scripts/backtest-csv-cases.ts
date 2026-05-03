import { strict as assert } from "node:assert";
import { analyzeBacktest, type Market } from "../lib/backtest";

function mkMarket(
  slug: string,
  tf: "15m" | "1h" | "4h" | "1d",
  startTs: number,
  endTs: number,
  points: Array<{ t: number; p: number }>,
): Market {
  return {
    slug,
    startTs,
    endTs,
    sourceTimeframe: tf,
    yesTokenHistory: { history: points },
  };
}

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const baseTs = Math.floor(1_720_000_000 / 900) * 900;
const market15 = mkMarket(
  `btc-updown-15m-${baseTs}`,
  "15m",
  baseTs,
  baseTs + 15 * 60,
  [
    { t: baseTs, p: 0.40 },
    { t: baseTs + 5 * 60, p: 0.55 },
    { t: baseTs + 10 * 60, p: 0.72 },
    { t: baseTs + 15 * 60, p: 0.95 },
  ],
);

runCase("early exit settles at exit price", () => {
  const csv = [
    "Trade #,Type,Date and time,Signal,Price USDT,Net P&L USDT,Net P&L %",
    `1,Entry long,${new Date(baseTs * 1000).toISOString()},BUY,100,0,0`,
    `1,Exit long,${new Date((baseTs + 5 * 60) * 1000).toISOString()},SELL,101,0,0`,
  ].join("\n");
  const r = analyzeBacktest({
    tradesCsv: csv,
    markets: [market15],
    marketType: "15m",
    config: {
      csvTimeframe: "15m",
      asset: "BTC",
      stakeUsd: 10,
      timestampsAreUtc: true,
      processOrdersOnClose: false,
      allowMultipleEntriesSameMarket: true,
      oppositeSignalMode: "flip-side",
    },
  });
  assert.equal(r.matched.length, 1);
  // entry at 0.40, exit near 0.55 => ROI around +37.5%
  assert.ok(r.matched[0].tokenPnl > 0.30 && r.matched[0].tokenPnl < 0.50);
});

runCase("late exit (after market end) auto-resolves", () => {
  const csv = [
    "Trade #,Type,Date and time,Signal,Price USDT,Net P&L USDT,Net P&L %",
    `1,Entry long,${new Date(baseTs * 1000).toISOString()},BUY,100,0,0`,
    `1,Exit long,${new Date((baseTs + 8 * 60 * 60) * 1000).toISOString()},SELL,101,0,0`,
  ].join("\n");
  const r = analyzeBacktest({
    tradesCsv: csv,
    markets: [market15],
    marketType: "15m",
    config: {
      csvTimeframe: "15m",
      asset: "BTC",
      stakeUsd: 10,
      timestampsAreUtc: true,
      processOrdersOnClose: false,
      allowMultipleEntriesSameMarket: true,
      oppositeSignalMode: "flip-side",
    },
  });
  assert.equal(r.matched.length, 1);
  // resolved YES at end => binary payout
  assert.ok(r.matched[0].tokenPnl > 1.4);
});

runCase("opposite signal flips position (deterministic)", () => {
  const csv = [
    "Trade #,Type,Date and time,Signal,Price USDT,Net P&L USDT,Net P&L %",
    `1,Entry long,${new Date(baseTs * 1000).toISOString()},BUY,100,0,0`,
    `2,Entry short,${new Date((baseTs + 120) * 1000).toISOString()},SELL,99,0,0`,
  ].join("\n");
  const r = analyzeBacktest({
    tradesCsv: csv,
    markets: [market15],
    marketType: "15m",
    config: {
      csvTimeframe: "15m",
      asset: "BTC",
      stakeUsd: 10,
      timestampsAreUtc: true,
      processOrdersOnClose: false,
      allowMultipleEntriesSameMarket: true,
      oppositeSignalMode: "flip-side",
    },
  });
  assert.ok(r.signalCount >= 2);
});

runCase("daily market allows meaningful in-window exits", () => {
  const start = Math.floor(baseTs / 3600) * 3600;
  const end = start + 24 * 60 * 60;
  const day = mkMarket(
    `bitcoin-up-or-down-on-july-1-2026`,
    "1d",
    start,
    end,
    [
      { t: start, p: 0.42 },
      { t: start + 6 * 60 * 60, p: 0.50 },
      { t: start + 12 * 60 * 60, p: 0.61 },
      { t: end, p: 0.20 },
    ],
  );
  const csv = [
    "Trade #,Type,Date and time,Signal,Price USDT,Net P&L USDT,Net P&L %",
    `1,Entry long,${new Date(start * 1000).toISOString()},BUY,100,0,0`,
    `1,Exit long,${new Date((start + 12 * 60 * 60) * 1000).toISOString()},SELL,101,0,0`,
  ].join("\n");
  const r = analyzeBacktest({
    tradesCsv: csv,
    markets: [day],
    marketType: "1d",
    config: {
      csvTimeframe: "1h",
      asset: "BTC",
      stakeUsd: 10,
      timestampsAreUtc: true,
      processOrdersOnClose: false,
      allowMultipleEntriesSameMarket: true,
      oppositeSignalMode: "flip-side",
    },
  });
  assert.equal(r.matched.length, 1);
  // Early exit at 0.61 should be profitable despite end resolving to 0.20.
  assert.ok(r.matched[0].tokenPnl > 0);
});

if (!process.exitCode) {
  console.log("All CSV behavior tests passed.");
}
