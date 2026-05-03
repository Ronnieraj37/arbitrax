import { NextRequest, NextResponse } from "next/server";

function mapTimeframeToBinanceInterval(tf: string): string {
  const v = tf.toLowerCase();
  if (v === "1m") return "1m";
  if (v === "5m") return "5m";
  if (v === "15m") return "15m";
  if (v === "30m") return "30m";
  if (v === "1h") return "1h";
  if (v === "4h") return "4h";
  if (v === "1d") return "1d";
  return "15m";
}

function intervalSec(interval: string): number {
  switch (interval) {
    case "1m":
      return 60;
    case "5m":
      return 300;
    case "15m":
      return 900;
    case "30m":
      return 1800;
    case "1h":
      return 3600;
    case "4h":
      return 14400;
    case "1d":
      return 86400;
    default:
      return 900;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = (searchParams.get("asset") ?? "BTC").toUpperCase();
  const timeframe = searchParams.get("timeframe") ?? "15m";
  const start = Number(searchParams.get("start") ?? "");
  const end = Number(searchParams.get("end") ?? "");

  const symbol = asset === "ETH" ? "ETHUSDT" : "BTCUSDT";
  const interval = mapTimeframeToBinanceInterval(timeframe);
  const stepSec = intervalSec(interval);

  const startSec = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0;
  const endSec =
    Number.isFinite(end) && end > 0
      ? Math.floor(end)
      : Math.floor(Date.now() / 1000);

  // Binance uses ms and returns up to 1000 items. We paginate backwards from endTime.
  const maxPerReq = 1000;
  const maxReq = 25; // safety cap: up to ~25k candles

  const out: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  let cursorEndMs = endSec * 1000;
  const startMs = startSec ? startSec * 1000 : 0;

  for (let i = 0; i < maxReq; i++) {
    const qs = new URLSearchParams({
      symbol,
      interval,
      limit: String(maxPerReq),
      endTime: String(cursorEndMs),
    });
    if (startMs) qs.set("startTime", String(startMs));

    const url = `https://api.binance.com/api/v3/klines?${qs.toString()}`;
    const res = await fetch(url, { next: { revalidate: 15 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch candles", status: res.status },
        { status: 500 },
      );
    }
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) break;

    const batch = data.map((k) => ({
      time: Math.floor(Number(k[0]) / 1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));

    out.push(...batch);

    const oldestOpenMs = Number(data[0]?.[0] ?? 0);
    if (!oldestOpenMs) break;
    if (startMs && oldestOpenMs <= startMs + stepSec * 1000) break;

    // move cursor before the oldest candle to avoid duplicates
    cursorEndMs = oldestOpenMs - 1;
  }

  // Dedup + sort ascending
  const byTime = new Map<number, (typeof out)[number]>();
  for (const c of out) byTime.set(c.time, c);
  const candles = Array.from(byTime.values()).sort((a, b) => a.time - b.time);

  return NextResponse.json({ symbol, interval, candles });
}
