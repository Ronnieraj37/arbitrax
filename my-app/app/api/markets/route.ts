import { NextResponse } from "next/server";
import { getActiveBtcMarkets } from "@/lib/market-data";

/**
 * GET /api/markets — Returns active BTC Up/Down markets with live prices.
 * This app is focused on Bitcoin binary markets, so we only return those.
 */
export async function GET() {
  try {
    const markets = await getActiveBtcMarkets();
    return NextResponse.json({ markets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ markets: [], error: message }, { status: 502 });
  }
}
