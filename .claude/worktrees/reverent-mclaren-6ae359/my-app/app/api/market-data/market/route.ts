import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type Timeframe = "15m" | "1h" | "4h" | "1d";
type Asset = "BTC" | "ETH";
type PricePoint = { t: number; p: number };
type MarketBundle = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  startIso: string;
  endIso: string;
  tokens?: { yes?: { tokenId?: string } | null } | any;
  yesTokenHistory?: { history: PricePoint[] } | null;
};

type MarketDataFile = {
  generatedAt: string;
  timeframe: Timeframe;
  markets: MarketBundle[];
};

const DATA_DIR = path.resolve(process.cwd(), "public/data");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") ?? "15m") as Timeframe;
  const asset = (searchParams.get("asset") ?? "BTC").toUpperCase() as Asset;
  const slug = searchParams.get("slug");
  if (!slug)
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  if (!["15m", "1h", "4h", "1d"].includes(timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }
  if (!["BTC", "ETH"].includes(asset)) {
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  }

  const isEth = asset === "ETH";
  const candidates = [
    // New naming (preferred)
    path.join(
      DATA_DIR,
      isEth
        ? `last-${timeframe}-markets-index-eth.json`
        : `last-${timeframe}-markets-index.json`,
    ),
    path.join(
      DATA_DIR,
      isEth
        ? `last-${timeframe}-markets-eth.json`
        : `last-${timeframe}-markets.json`,
    ),
    // Legacy naming (fallback)
    path.join(DATA_DIR, `markets-index-${timeframe}.json`),
    path.join(DATA_DIR, `markets-${timeframe}.json`),
  ];

  let filePath: string | null = null;
  for (const p of candidates) {
    try {
      await stat(p);
      filePath = p;
      break;
    } catch {
      // try next
    }
  }
  if (!filePath) {
    return NextResponse.json(
      { error: `Missing market data file for ${asset} ${timeframe}` },
      { status: 500 },
    );
  }

  const txt = await readFile(filePath, "utf8");
  const data = JSON.parse(txt) as MarketDataFile;
  const m = data.markets.find((x) => x.slug === slug) as
    | MarketBundle
    | undefined;
  if (!m)
    return NextResponse.json({ error: "Market not found" }, { status: 404 });

  // If index file: fetch yesTokenHistory live from backend using tokenId.
  if (!m.yesTokenHistory) {
    const tokenId = m.tokens?.yes?.tokenId;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (base && tokenId && m.startTs && m.endTs) {
      const res = await fetch(
        `${base.replace(/\/$/, "")}/v1/markets/prices-history?tokenId=${encodeURIComponent(
          tokenId,
        )}&startTs=${m.startTs}&endTs=${m.endTs}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const json = await res.json();
        m.yesTokenHistory = json.yesTokenHistory ?? null;
      }
    }
  }

  return NextResponse.json({
    generatedAt: data.generatedAt,
    timeframe: data.timeframe,
    market: m,
  });
}
