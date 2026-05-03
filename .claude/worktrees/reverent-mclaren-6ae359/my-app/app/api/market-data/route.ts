import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type Timeframe = "15m" | "1h" | "4h" | "1d";
type Asset = "BTC" | "ETH";
type MarketBundle = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  labelLocal?: string | null;
  startIso?: string;
  endIso?: string;
};

type MarketDataFile = {
  generatedAt: string;
  timeframe: Timeframe;
  range: { markets: number; startTs: number | null; endTs: number | null };
  markets: MarketBundle[];
};

const DATA_DIR = path.resolve(process.cwd(), "public/data");

const cache = new Map<
  string,
  { loadedAtMs: number; data: MarketDataFile; fileMtimeMs: number }
>();

async function loadFile(
  timeframe: Timeframe,
  asset: Asset,
): Promise<MarketDataFile> {
  // Prefer lightweight index file if present
  // New naming: last-{tf}-markets(.json | -eth.json)
  // Optional index: last-{tf}-markets-index(.json | -eth.json)
  // Fallback to legacy: markets-{tf}.json
  const isEth = asset === "ETH";
  const indexPath = path.join(
    DATA_DIR,
    isEth
      ? `last-${timeframe}-markets-index-eth.json`
      : `last-${timeframe}-markets-index.json`,
  );
  const fullPath = path.join(
    DATA_DIR,
    isEth
      ? `last-${timeframe}-markets-eth.json`
      : `last-${timeframe}-markets.json`,
  );
  const legacyIndexPath = path.join(
    DATA_DIR,
    `markets-index-${timeframe}.json`,
  );
  const legacyFullPath = path.join(DATA_DIR, `markets-${timeframe}.json`);

  const tryPath = async (p: string) => {
    try {
      const s = await stat(p);
      return { path: p, mtimeMs: s.mtimeMs };
    } catch {
      return null;
    }
  };

  const pick =
    (await tryPath(indexPath)) ??
    (await tryPath(fullPath)) ??
    (await tryPath(legacyIndexPath)) ??
    (await tryPath(legacyFullPath));
  if (!pick) throw new Error(`Missing market data for timeframe ${timeframe}`);

  const cacheKey = `${asset}:${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.fileMtimeMs === pick.mtimeMs) return cached.data;

  const txt = await readFile(pick.path, "utf8");
  const data = JSON.parse(txt) as MarketDataFile;
  cache.set(cacheKey, {
    loadedAtMs: Date.now(),
    data,
    fileMtimeMs: pick.mtimeMs,
  });
  return data;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") ?? "15m") as Timeframe;
  const asset = (searchParams.get("asset") ?? "BTC").toUpperCase() as Asset;
  const status = (searchParams.get("status") ?? "active") as
    | "active"
    | "resolved"
    | "all";
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "25", 10) || 25,
    200,
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );

  if (!["15m", "1h", "4h", "1d"].includes(timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }
  if (!["BTC", "ETH"].includes(asset)) {
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  }
  if (!["active", "resolved", "all"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const data = await loadFile(timeframe, asset);

  const nowSec = Math.floor(Date.now() / 1000);
  const filtered = data.markets.filter((m) => {
    const resolved = m.endTs <= nowSec;
    if (status === "all") return true;
    if (status === "resolved") return resolved;
    return !resolved;
  });

  const slice = filtered.slice(offset, offset + limit).map((m) => ({
    slug: m.slug,
    title: m.title,
    startTs: m.startTs,
    endTs: m.endTs,
    labelLocal: m.labelLocal ?? null,
    resolved: m.endTs <= nowSec,
  }));

  const startTs = filtered[0]?.startTs ?? null;
  const endTs = filtered[filtered.length - 1]?.endTs ?? null;

  return NextResponse.json({
    generatedAt: data.generatedAt,
    timeframe: data.timeframe,
    range: { markets: filtered.length, startTs, endTs },
    total: filtered.length,
    limit,
    offset,
    markets: slice,
  });
}
