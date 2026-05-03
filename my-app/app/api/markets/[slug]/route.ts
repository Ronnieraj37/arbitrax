import { NextRequest, NextResponse } from "next/server";
import { getTokenIds, getPrices } from "@/lib/trading/polymarket-utils";
import axios from "axios";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  try {
    // Fetch market metadata
    const [marketRes, tokenIds] = await Promise.all([
      axios
        .get(`${GAMMA_API_BASE}/markets/slug/${slug}`, { timeout: 5000 })
        .catch(() => null),
      getTokenIds(slug),
    ]);

    const market = marketRes?.data;

    let prices = null;
    if (tokenIds) {
      prices = await getPrices(tokenIds.yesTokenId, tokenIds.noTokenId);
    }

    return NextResponse.json({
      market: market || null,
      tokenIds,
      prices,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch market" },
      { status: 502 },
    );
  }
}
