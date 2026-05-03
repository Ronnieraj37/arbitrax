/**
 * Computes the live Polymarket up/down slug from (asset, timeframe).
 * Mirrors `ref/market_utils.py` so the editor previews exactly what the bot
 * will hit at run time.
 *
 *   slug = `${btc|eth}-updown-${15m|1h|4h|1d}-${flooredStartTimestampSec}`
 */

const TIMEFRAME_SECONDS: Record<string, number> = {
  "15m": 15 * 60,
  "1h": 60 * 60,
  "4h": 4 * 60 * 60,
  "1d": 24 * 60 * 60,
};

export function flooredStart(timeframe: string, nowSec?: number): number {
  const step = TIMEFRAME_SECONDS[timeframe];
  if (!step) return 0;
  const t = Math.floor((nowSec ?? Date.now() / 1000) / step) * step;
  return t;
}

export function activeMarketSlug(
  asset: string | undefined,
  timeframe: string | undefined,
  nowSec?: number,
): string | null {
  if (!asset || !timeframe) return null;
  const prefix = asset.toLowerCase() === "eth" ? "eth" : "btc";
  const start = flooredStart(timeframe, nowSec);
  if (!start) return null;
  return `${prefix}-updown-${timeframe}-${start}`;
}

export function bitstampPair(asset: string | undefined): string | null {
  if (!asset) return null;
  return asset.toLowerCase() === "eth" ? "ethusd" : "btcusd";
}

export function formatWindow(timeframe: string, nowSec?: number): string {
  const start = flooredStart(timeframe, nowSec);
  if (!start) return "";
  const startD = new Date(start * 1000);
  const endD = new Date((start + TIMEFRAME_SECONDS[timeframe]) * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(startD)} → ${fmt(endD)}`;
}
