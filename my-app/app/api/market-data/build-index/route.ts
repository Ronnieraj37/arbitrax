import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Timeframe = "15m" | "1h" | "4h" | "1d";
type MarketBundle = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  startIso?: string;
  endIso?: string;
  labelLocal?: string | null;
  labelUTC?: string | null;
  tokens?: unknown;
};

type MarketDataFile = {
  generatedAt: string;
  timeframe: Timeframe;
  range: { markets: number; startTs: number | null; endTs: number | null };
  markets: MarketBundle[];
};

const DATA_DIR = path.resolve(process.cwd(), "public/data");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const timeframe = (body?.timeframe ?? "15m") as Timeframe;
  if (!["15m", "1h", "4h", "1d"].includes(timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }

  const fullPath = path.join(DATA_DIR, `markets-${timeframe}.json`);
  const indexPath = path.join(DATA_DIR, `markets-index-${timeframe}.json`);
  const txt = await readFile(fullPath, "utf8");
  const data = JSON.parse(txt) as MarketDataFile;

  const index: MarketDataFile = {
    generatedAt: data.generatedAt,
    timeframe: data.timeframe,
    range: data.range,
    markets: data.markets.map((m) => ({
      slug: m.slug,
      title: m.title ?? null,
      startTs: m.startTs,
      endTs: m.endTs,
      startIso: m.startIso,
      endIso: m.endIso,
      labelLocal: m.labelLocal ?? null,
      labelUTC: m.labelUTC ?? null,
      tokens: m.tokens,
    })),
  };

  await writeFile(indexPath, JSON.stringify(index), "utf8");

  return NextResponse.json({
    success: true,
    timeframe,
    markets: index.range.markets,
    indexFile: `public/data/markets-index-${timeframe}.json`,
  });
}
