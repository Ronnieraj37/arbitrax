import axios from "axios";
import { ClobClient, Side, OrderType } from "@polymarket/clob-client";

export const HOST = "https://clob.polymarket.com";
export const DATA_API_BASE = "https://data-api.polymarket.com";
export const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
export const CHAIN_ID = 137;
export const SIGNATURE_TYPE = 2;

const parseArray = <T>(value: unknown, mapper: (item: unknown) => T): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(mapper);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(mapper) : [mapper(parsed)];
    } catch {
      return [];
    }
  }
  return [mapper(value)];
};

const tokenIdCache = new Map<
  string,
  { yesTokenId: string; noTokenId: string; cachedAt: number }
>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getTokenIds(
  slug: string,
): Promise<{ yesTokenId: string; noTokenId: string } | null> {
  const cached = tokenIdCache.get(slug);
  if (cached && Date.now() - cached.cachedAt < TOKEN_CACHE_TTL) {
    return { yesTokenId: cached.yesTokenId, noTokenId: cached.noTokenId };
  }

  try {
    const url = `${GAMMA_API_BASE}/markets/slug/${slug}`;
    const response = await axios.get(url, { timeout: 5000 });
    const market = response.data;
    if (market) {
      const outcomes = parseArray(market.outcomes, String);
      const tokenIds = parseArray(market.clobTokenIds, String);
      if (outcomes.length >= 2 && tokenIds.length >= 2) {
        const upIdx = outcomes.findIndex(
          (o) =>
            String(o).toLowerCase() === "up" ||
            String(o).toLowerCase() === "yes",
        );
        const downIdx = outcomes.findIndex(
          (o) =>
            String(o).toLowerCase() === "down" ||
            String(o).toLowerCase() === "no",
        );
        if (upIdx !== -1 && downIdx !== -1) {
          const result = {
            yesTokenId: tokenIds[upIdx],
            noTokenId: tokenIds[downIdx],
          };
          tokenIdCache.set(slug, { ...result, cachedAt: Date.now() });
          return result;
        }
      }
    }
  } catch {
    // Fall through to Data API
  }

  try {
    const url = `${DATA_API_BASE}/markets/${slug}`;
    const response = await axios.get(url, { timeout: 5000 });
    const market = response.data;
    if (market?.tokens) {
      const yesToken = market.tokens.find(
        (t: { outcome: string }) => t.outcome === "Yes" || t.outcome === "Up",
      );
      const noToken = market.tokens.find(
        (t: { outcome: string }) => t.outcome === "No" || t.outcome === "Down",
      );
      if (yesToken?.token_id && noToken?.token_id) {
        const result = {
          yesTokenId: yesToken.token_id,
          noTokenId: noToken.token_id,
        };
        tokenIdCache.set(slug, { ...result, cachedAt: Date.now() });
        return result;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function getPrices(
  yesTokenId: string,
  noTokenId: string,
): Promise<{
  yesBuy: number;
  yesSell: number;
  noBuy: number;
  noSell: number;
} | null> {
  try {
    const payload = [
      { token_id: yesTokenId, side: "BUY" },
      { token_id: yesTokenId, side: "SELL" },
      { token_id: noTokenId, side: "BUY" },
      { token_id: noTokenId, side: "SELL" },
    ];
    const response = await axios.post(`${HOST}/prices`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
    if (response.status !== 200) return null;
    const data = response.data;
    const yesBuy = parseFloat(data?.[yesTokenId]?.BUY || "0") || 0;
    const yesSell = parseFloat(data?.[yesTokenId]?.SELL || "0") || 0;
    const noBuy = parseFloat(data?.[noTokenId]?.BUY || "0") || 0;
    const noSell = parseFloat(data?.[noTokenId]?.SELL || "0") || 0;
    if (yesBuy <= 0 || noBuy <= 0) return null;
    return { yesBuy, yesSell, noBuy, noSell };
  } catch {
    return null;
  }
}

export async function getPrice(
  tokenId: string,
  side: "BUY" | "SELL",
): Promise<number | null> {
  try {
    const response = await axios.post(
      `${HOST}/prices`,
      [{ token_id: tokenId, side }],
      { headers: { "Content-Type": "application/json" }, timeout: 5000 },
    );
    const price = parseFloat(response.data[tokenId]?.[side] || "0");
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

/** Batch fetch prices for multiple tokens at once. */
export async function getBatchPrices(
  tokenIds: string[],
  side: "BUY" | "SELL",
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (tokenIds.length === 0) return result;

  try {
    const payload = tokenIds.map((id) => ({ token_id: id, side }));
    const response = await axios.post(`${HOST}/prices`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });
    const data = response.data;
    for (const id of tokenIds) {
      const price = parseFloat(data?.[id]?.[side] || "0");
      if (price > 0) result.set(id, price);
    }
  } catch {
    // Return whatever we have
  }
  return result;
}

export async function getActualPosition(
  funderAddress: string,
  slug: string,
  tokenId: string,
  maxRetries: number = 3,
): Promise<{ shares: number; avgPrice: number } | null> {
  const normalizedTokenId = String(tokenId).trim();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = `${DATA_API_BASE}/positions?user=${funderAddress}`;
      const response = await axios.get(url, { timeout: 5000 });
      const positions = response.data || [];

      if (!Array.isArray(positions)) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        return null;
      }

      const position = positions.find(
        (p: { asset?: string; slug?: string; eventSlug?: string }) => {
          const asset = p.asset != null ? String(p.asset).trim() : "";
          if (asset !== normalizedTokenId) return false;
          const pSlug = (p.slug || p.eventSlug || "").trim();
          return pSlug === slug || pSlug.endsWith(slug) || slug.endsWith(pSlug);
        },
      );

      if (!position) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        return null;
      }

      const shares = parseFloat(position.size ?? position.shares ?? "0") || 0;
      const avgPrice =
        parseFloat(position.avgPrice ?? position.avg_price ?? "0") || 0;

      if (shares > 0) return { shares, avgPrice };
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      return { shares, avgPrice };
    } catch {
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  return null;
}

export async function placeOrder(
  client: ClobClient | null,
  tokenId: string,
  side: Side,
  amount: number,
  maxRetries: number = 3,
  isTestMode: boolean = false,
  logSuccess: boolean = true,
): Promise<boolean> {
  if (isTestMode) return true;
  if (!client) return false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt === 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 1000 + 500),
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const response = await client.createAndPostMarketOrder(
        { tokenID: tokenId, amount, side },
        undefined,
        OrderType.FAK,
      );

      if (
        response &&
        ((response as Record<string, unknown>).errorMsg ||
          (response as Record<string, unknown>).error)
      ) {
        throw new Error(
          String(
            (response as Record<string, unknown>).errorMsg ||
              (response as Record<string, unknown>).error,
          ),
        );
      }

      return true;
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: string }; status?: number };
        message?: string;
        status?: number;
      };
      const errorMsg =
        err.response?.data?.error || err.message || String(error);

      if (
        errorMsg.includes("not enough balance") ||
        errorMsg.includes("allowance")
      ) {
        if (logSuccess)
          console.error("Order failed: insufficient balance/allowance");
        return false;
      }

      const statusCode = err.response?.status || err.status;
      if (statusCode === 403) {
        if (logSuccess) console.error("Order blocked by Cloudflare (403)");
        return false;
      }

      if (attempt >= maxRetries) {
        if (logSuccess)
          console.error(
            `Order failed after ${maxRetries} attempts: ${errorMsg}`,
          );
        return false;
      }
    }
  }
  return false;
}
