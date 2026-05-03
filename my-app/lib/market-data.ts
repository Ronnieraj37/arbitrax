/**
 * Shared market data fetching library.
 * Fetches Bitcoin Up/Down market history from Polymarket APIs.
 * Uses polymarket-utils for API calls.
 * Used by CLI scripts, cron jobs, and the Markets page.
 */

import {
  GAMMA_API_BASE,
  HOST as CLOB_API_BASE,
  getTokenIds,
  getPrices,
  getBatchPrices,
} from "@/lib/trading/polymarket-utils";

const ET = "America/New_York";
const ET_OFFSET_SEC = -5 * 3600; // EST = UTC-5

type PricePoint = { t: number; p: number };
type PriceHistoryResponse = { history: PricePoint[] };

type GammaMarket = {
  id?: string;
  question?: string;
  outcomes?: string | string[];
  clobTokenIds?: string | string[];
  startDate?: string;
  endDate?: string;
  eventStartTime?: string;
};

type GammaEvent = {
  id?: string;
  slug?: string;
  title?: string;
  markets?: GammaMarket[];
};

type OutcomeToken = {
  outcome: string;
  tokenId: string;
};

export type MarketBundle = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  startIso: string;
  endIso: string;
  tokens: {
    yes: OutcomeToken | null;
    no: OutcomeToken | null;
  };
  yesTokenHistory: PriceHistoryResponse | null;
};

export type MarketDataFile = {
  generatedAt: string;
  timeframe: string;
  range: {
    markets: number;
    startTs: number | null;
    endTs: number | null;
  };
  markets: MarketBundle[];
};

export type Timeframe = "15m" | "1h" | "4h" | "1d";

export type FetchProgress = {
  timeframe: string;
  current: number;
  total: number;
  found: number;
  skipped: number;
};

/** Active BTC market info for the Markets page */
export type ActiveBtcMarket = {
  slug: string;
  timeframe: Timeframe;
  startTs: number;
  endTs: number;
  upTokenId: string;
  downTokenId: string;
  upPrice: number | null;
  downPrice: number | null;
  status: "active" | "upcoming" | "ended";
  timeLeftSec: number;
};

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

function pickUpDownTokens(
  outcomes: string[],
  tokenIds: string[],
): { up: OutcomeToken | null; down: OutcomeToken | null } {
  const all = outcomes
    .map((outcome, i) => ({ outcome, tokenId: tokenIds[i] }))
    .filter((x): x is OutcomeToken => !!x.outcome && !!x.tokenId);

  const normalized = all.map((x) => ({
    ...x,
    norm: x.outcome.toLowerCase().trim(),
  }));

  const upCandidate =
    normalized.find((x) => x.norm === "up") ??
    normalized.find((x) => x.norm === "yes") ??
    normalized[0];

  const downCandidate =
    normalized.find((x) => x.norm === "down") ??
    normalized.find((x) => x.norm === "no") ??
    normalized.find((x) => x.tokenId !== upCandidate?.tokenId) ??
    null;

  return {
    up: upCandidate
      ? { outcome: upCandidate.outcome, tokenId: upCandidate.tokenId }
      : null,
    down: downCandidate
      ? { outcome: downCandidate.outcome, tokenId: downCandidate.tokenId }
      : null,
  };
}

// ─── Slug generators ────────────────────────────────────────────

function formatHourForSlug(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/** 15m markets: btc-updown-15m-{utcEpoch} — uses /markets/slug/ endpoint */
function slugFor15m(startTs: number): string {
  return `btc-updown-15m-${startTs}`;
}

/** 1h markets — new format with year: bitcoin-up-or-down-{month}-{day}-{year}-{hourStr}-et */
export function slugFor1h(startTs: number): string {
  const d = new Date(startTs * 1000);
  const month = d
    .toLocaleString("en-US", { timeZone: ET, month: "long" })
    .toLowerCase();
  const day = d.toLocaleString("en-US", { timeZone: ET, day: "numeric" });
  const year = d.toLocaleString("en-US", { timeZone: ET, year: "numeric" });
  const hour = parseInt(
    d.toLocaleString("en-US", { timeZone: ET, hour: "numeric", hour12: false }),
    10,
  );
  const hourStr = formatHourForSlug(hour);
  return `bitcoin-up-or-down-${month}-${day}-${year}-${hourStr}-et`;
}

/** 1h slug candidates (new format first, old format fallback) for market lookup */
export function slugCandidatesFor1h(startTs: number): string[] {
  const d = new Date(startTs * 1000);
  const month = d
    .toLocaleString("en-US", { timeZone: ET, month: "long" })
    .toLowerCase();
  const day = d.toLocaleString("en-US", { timeZone: ET, day: "numeric" });
  const year = d.toLocaleString("en-US", { timeZone: ET, year: "numeric" });
  const hour = parseInt(
    d.toLocaleString("en-US", { timeZone: ET, hour: "numeric", hour12: false }),
    10,
  );
  const hourStr = formatHourForSlug(hour);
  return [
    `bitcoin-up-or-down-${month}-${day}-${year}-${hourStr}-et`,
    `bitcoin-up-or-down-${month}-${day}-${hourStr}-et`,
  ];
}

/** 4h markets: btc-updown-4h-{utcEpoch} — uses /events endpoint */
function slugFor4h(startTs: number): string {
  return `btc-updown-4h-${startTs}`;
}

/** 1d markets — new format with year: bitcoin-up-or-down-on-{month}-{day}-{year} */
function slugFor1d(startTs: number): string {
  const d = new Date(startTs * 1000);
  const month = d
    .toLocaleString("en-US", { timeZone: ET, month: "long" })
    .toLowerCase();
  const day = d.toLocaleString("en-US", { timeZone: ET, day: "numeric" });
  const year = d.toLocaleString("en-US", { timeZone: ET, year: "numeric" });
  return `bitcoin-up-or-down-on-${month}-${day}-${year}`;
}

/** 1d slug candidates (new format first, old format fallback) for market lookup */
export function slugCandidatesFor1d(startTs: number): string[] {
  const d = new Date(startTs * 1000);
  const month = d
    .toLocaleString("en-US", { timeZone: ET, month: "long" })
    .toLowerCase();
  const day = d.toLocaleString("en-US", { timeZone: ET, day: "numeric" });
  const year = d.toLocaleString("en-US", { timeZone: ET, year: "numeric" });
  return [
    `bitcoin-up-or-down-on-${month}-${day}-${year}`,
    `bitcoin-up-or-down-on-${month}-${day}`,
  ];
}

// ─── Start time generators ──────────────────────────────────────

/**
 * Get the UTC-to-ET offset in seconds (e.g. +18000 for EST, +14400 for EDT).
 * Uses Intl to get the correct ET time components, avoiding locale-parse bugs.
 */
function getEtToUtcOffsetSec(): number {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const g = (type: string) => {
    const v = parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
    return type === "hour" && v === 24 ? 0 : v;
  };
  // Build a UTC date with the ET components → difference gives offset
  const etAsUtcMs = Date.UTC(
    g("year"),
    g("month") - 1,
    g("day"),
    g("hour"),
    g("minute"),
    g("second"),
  );
  return Math.round((now.getTime() - etAsUtcMs) / 1000);
}

/**
 * 15m and 1h markets: UTC-aligned (900s and 3600s divide all US timezone offsets).
 * The epoch in the slug IS the UTC start of the window.
 */
function get15mStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  return Math.floor(nowUtc / 900) * 900 - n * 900;
}

function get1hStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  return Math.floor(nowUtc / 3600) * 3600 - n * 3600;
}

/**
 * 4h markets: ET-aligned (4h blocks start at midnight ET).
 * Need proper ET offset because 14400 does not evenly divide 18000.
 */
function get4hStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  const offsetSec = getEtToUtcOffsetSec(); // e.g. 18000 for EST
  const nowEt = nowUtc - offsetSec; // nowEt is "ET wall-clock" as unix-like
  const midnightEt = Math.floor(nowEt / 86400) * 86400;
  const secSinceMidnight = nowEt - midnightEt;
  const currentBlockIdx = Math.floor(secSinceMidnight / (4 * 3600));
  const currentBlockStartEt = midnightEt + currentBlockIdx * 4 * 3600;
  const targetBlockStartEt = currentBlockStartEt - n * 4 * 3600;
  return targetBlockStartEt + offsetSec; // convert back to UTC
}

/**
 * 1d markets: ET-aligned (start at midnight ET).
 */
function get1dStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  const offsetSec = getEtToUtcOffsetSec();
  const nowEt = nowUtc - offsetSec;
  const midnightEt = Math.floor(nowEt / 86400) * 86400;
  const targetMidnightEt = midnightEt - n * 86400;
  return targetMidnightEt + offsetSec;
}

/** Export slug generators for external use (active markets API) */
export const slugGenerators = {
  "15m": slugFor15m,
  "1h": slugFor1h,
  "4h": slugFor4h,
  "1d": slugFor1d,
};

/** Export start time generators for external use */
export const startTimeGenerators = {
  "15m": get15mStartNAgo,
  "1h": get1hStartNAgo,
  "4h": get4hStartNAgo,
  "1d": get1dStartNAgo,
};

/** Duration in seconds per timeframe */
export const TIMEFRAME_DURATION: Record<Timeframe, number> = {
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

// ─── API fetchers ───────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  params: Record<string, unknown>,
  retries = 2,
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) searchParams.set(k, String(v));
      }
      const qs = searchParams.toString();
      const fullUrl = qs ? `${url}?${qs}` : url;
      const res = await fetch(fullUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

async function fetchEventBySlug(slug: string): Promise<GammaEvent | null> {
  try {
    const data = (await fetchWithRetry(`${GAMMA_API_BASE}/events`, {
      slug,
    })) as unknown;
    if (Array.isArray(data) && data.length > 0) return data[0] as GammaEvent;
    if (data && typeof data === "object" && "slug" in data)
      return data as GammaEvent;
    return null;
  } catch {
    return null;
  }
}

async function fetchMarketBySlug(slug: string): Promise<GammaMarket | null> {
  try {
    const data = (await fetchWithRetry(
      `${GAMMA_API_BASE}/markets/slug/${slug}`,
      {},
    )) as unknown;
    if (data && typeof data === "object") return data as GammaMarket;
    return null;
  } catch {
    return null;
  }
}

async function fetchTokenPriceHistory(
  tokenId: string,
  startTs: number,
  endTs: number,
): Promise<PriceHistoryResponse | null> {
  try {
    const data = (await fetchWithRetry(`${CLOB_API_BASE}/prices-history`, {
      market: tokenId,
      startTs,
      endTs,
      fidelity: 1,
    })) as unknown;
    if (
      data &&
      typeof data === "object" &&
      "history" in data &&
      Array.isArray((data as { history: unknown }).history)
    ) {
      return { history: (data as { history: PricePoint[] }).history };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Active BTC Markets (for Markets page) ──────────────────────

/**
 * Get currently active and upcoming BTC Up/Down markets with live prices.
 * Uses polymarket-utils for token IDs and prices.
 */
export async function getActiveBtcMarkets(): Promise<ActiveBtcMarket[]> {
  const nowUtc = Math.floor(Date.now() / 1000);
  const results: ActiveBtcMarket[] = [];

  // For each timeframe, get current + next market
  const timeframes: Timeframe[] = ["15m", "1h", "4h", "1d"];
  const lookback = { "15m": 0, "1h": 0, "4h": 0, "1d": 0 };
  const lookahead = { "15m": 1, "1h": 1, "4h": 0, "1d": 0 };

  const fetchPromises: Promise<void>[] = [];

  for (const tf of timeframes) {
    const slugGen = slugGenerators[tf];
    const startGen = startTimeGenerators[tf];
    const duration = TIMEFRAME_DURATION[tf];

    for (let n = -lookahead[tf]; n <= lookback[tf]; n++) {
      const startTs = startGen(n);
      const endTs = startTs + duration;
      const slug = slugGen(startTs);

      fetchPromises.push(
        (async () => {
          const tokenData = await getTokenIds(slug);
          if (!tokenData) return;

          const timeLeftSec = endTs - nowUtc;
          let status: "active" | "upcoming" | "ended" = "active";
          if (nowUtc < startTs) status = "upcoming";
          else if (nowUtc >= endTs) status = "ended";

          results.push({
            slug,
            timeframe: tf,
            startTs,
            endTs,
            upTokenId: tokenData.yesTokenId,
            downTokenId: tokenData.noTokenId,
            upPrice: null,
            downPrice: null,
            status,
            timeLeftSec,
          });
        })(),
      );
    }
  }

  await Promise.all(fetchPromises);

  // Batch fetch live prices for all tokens
  const allUpTokens = results.map((m) => m.upTokenId).filter(Boolean);
  const allDownTokens = results.map((m) => m.downTokenId).filter(Boolean);

  const [upPrices, downPrices] = await Promise.all([
    getBatchPrices(allUpTokens, "BUY"),
    getBatchPrices(allDownTokens, "BUY"),
  ]);

  for (const market of results) {
    market.upPrice = upPrices.get(market.upTokenId) ?? null;
    market.downPrice = downPrices.get(market.downTokenId) ?? null;
  }

  // Sort: active first, then by timeframe order
  const tfOrder: Record<string, number> = {
    "15m": 0,
    "1h": 1,
    "4h": 2,
    "1d": 3,
  };
  results.sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder = { active: 0, upcoming: 1, ended: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return tfOrder[a.timeframe] - tfOrder[b.timeframe];
  });

  return results;
}

// ─── Fetch functions per timeframe (for backtest data) ──────────

export async function fetchMarkets(
  timeframe: Timeframe,
  count: number,
  onProgress?: (p: FetchProgress) => void,
  existingEndTs?: number,
): Promise<MarketBundle[]> {
  const entries: { slugs: string[]; startTs: number; durationSec: number }[] =
    [];
  const startGen = startTimeGenerators[timeframe];
  const slugGen = slugGenerators[timeframe];
  const durationSec = TIMEFRAME_DURATION[timeframe];

  const candidateGen =
    timeframe === "1h"
      ? slugCandidatesFor1h
      : timeframe === "1d"
        ? slugCandidatesFor1d
        : null;

  for (let n = 1; n <= count; n++) {
    const startTs = startGen(n);
    const slugs = candidateGen ? candidateGen(startTs) : [slugGen(startTs)];

    if (existingEndTs && startTs < existingEndTs) continue;

    entries.push({ slugs, startTs, durationSec });
  }

  if (!entries.length) return [];

  const bundles: MarketBundle[] = [];
  const concurrency = 4;
  let idx = 0;
  let found = 0;
  let skipped = 0;

  async function worker() {
    while (idx < entries.length) {
      const myIdx = idx++;
      const {
        slugs,
        startTs: fallbackStartTs,
        durationSec: dur,
      } = entries[myIdx];
      const primarySlug = slugs[0];

      let outcomes: string[] = [];
      let tokenIds: string[] = [];
      let startTs = fallbackStartTs;
      let endTs = fallbackStartTs + dur;
      let matchedSlug = primarySlug;

      if (timeframe === "15m") {
        const market = await fetchMarketBySlug(primarySlug);
        if (!market) {
          skipped++;
          onProgress?.({
            timeframe,
            current: myIdx + 1,
            total: entries.length,
            found,
            skipped,
          });
          continue;
        }
        outcomes = parseArray(market.outcomes, String);
        tokenIds = parseArray(market.clobTokenIds, String);
        if (market.startDate && market.endDate) {
          const s = new Date(market.startDate).getTime();
          const e = new Date(market.endDate).getTime();
          if (e > s) {
            startTs = Math.floor(s / 1000);
            endTs = Math.floor(e / 1000);
          }
        }
      } else {
        let event: GammaEvent | null = null;
        for (const candidate of slugs) {
          event = await fetchEventBySlug(candidate);
          if (event?.markets?.length) {
            matchedSlug = candidate;
            break;
          }
        }
        if (!event?.markets?.length) {
          skipped++;
          onProgress?.({
            timeframe,
            current: myIdx + 1,
            total: entries.length,
            found,
            skipped,
          });
          continue;
        }
        const market = event.markets[0]!;
        outcomes = parseArray(market.outcomes, String);
        tokenIds = parseArray(market.clobTokenIds, String);
        const eventStart = market.eventStartTime
          ? new Date(market.eventStartTime).getTime()
          : null;
        const endDate = market.endDate
          ? new Date(market.endDate).getTime()
          : null;
        if (eventStart != null && endDate != null && endDate > eventStart) {
          startTs = Math.floor(eventStart / 1000);
          endTs = Math.floor(endDate / 1000);
        }
      }

      const tokens = pickUpDownTokens(outcomes, tokenIds);
      if (!tokens.up) {
        skipped++;
        onProgress?.({
          timeframe,
          current: myIdx + 1,
          total: entries.length,
          found,
          skipped,
        });
        continue;
      }

      const yesTokenHistory = await fetchTokenPriceHistory(
        tokens.up.tokenId,
        startTs,
        endTs,
      );

      bundles.push({
        slug: matchedSlug,
        title: null,
        startTs,
        endTs,
        startIso: new Date(startTs * 1000).toISOString(),
        endIso: new Date(endTs * 1000).toISOString(),
        tokens: {
          yes: tokens.up,
          no: tokens.down,
        },
        yesTokenHistory,
      });

      found++;
      onProgress?.({
        timeframe,
        current: myIdx + 1,
        total: entries.length,
        found,
        skipped,
      });

      // Rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  bundles.sort((a, b) => a.startTs - b.startTs);
  return bundles;
}

export function buildMarketDataFile(
  timeframe: Timeframe,
  bundles: MarketBundle[],
  existingBundles?: MarketBundle[],
): MarketDataFile {
  let allBundles = bundles;
  if (existingBundles?.length) {
    const slugSet = new Set(bundles.map((b) => b.slug));
    const kept = existingBundles.filter((b) => !slugSet.has(b.slug));
    allBundles = [...kept, ...bundles].sort((a, b) => a.startTs - b.startTs);
  }

  return {
    generatedAt: new Date().toISOString(),
    timeframe,
    range: {
      markets: allBundles.length,
      startTs: allBundles[0]?.startTs ?? null,
      endTs: allBundles[allBundles.length - 1]?.endTs ?? null,
    },
    markets: allBundles,
  };
}

/** Default fetch counts per timeframe */
export const DEFAULT_COUNTS: Record<Timeframe, number> = {
  "15m": 2000,
  "1h": 2000,
  "4h": 250,
  "1d": 60,
};

/** Incremental daily counts (new markets per day) */
export const DAILY_INCREMENTAL: Record<Timeframe, number> = {
  "15m": 96, // 4 per hour × 24 hours
  "1h": 24, // 1 per hour × 24 hours
  "4h": 6, // 1 per 4 hours × 24 hours
  "1d": 1, // 1 per day
};
