import { Injectable } from '@nestjs/common';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const CLOB_API_BASE = 'https://clob.polymarket.com';
const ET = 'America/New_York';

type PricePoint = { t: number; p: number };
type PriceHistoryResponse = { history: PricePoint[] };

type GammaMarket = {
  outcomes?: string | string[];
  clobTokenIds?: string | string[];
  startDate?: string;
  endDate?: string;
};

type GammaEvent = {
  title?: string;
  markets?: Array<{
    outcomes?: string | string[];
    clobTokenIds?: string | string[];
    eventStartTime?: string;
    endDate?: string;
  }>;
};

type OutcomeToken = { outcome: string; tokenId: string };

export type MarketBundle = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  startIso: string;
  endIso: string;
  labelLocal: string | null;
  labelUTC: string | null;
  tokens: { yes: OutcomeToken | null; no: OutcomeToken | null };
  yesTokenHistory: PriceHistoryResponse | null;
};

export type MarketDataFile = {
  generatedAt: string;
  timeframe: string;
  range: { markets: number; startTs: number | null; endTs: number | null };
  markets: MarketBundle[];
};

function parseArray<T>(value: unknown, mapper: (item: unknown) => T): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(mapper);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(mapper) : [mapper(parsed)];
    } catch {
      return [];
    }
  }
  return [mapper(value)];
}

function pickUpDownTokens(outcomes: string[], tokenIds: string[]) {
  const all = outcomes
    .map((outcome, i) => ({ outcome, tokenId: tokenIds[i] }))
    .filter((x): x is OutcomeToken => !!x.outcome && !!x.tokenId);

  const normalized = all.map((x) => ({
    ...x,
    norm: x.outcome.toLowerCase().trim(),
  }));

  const upCandidate =
    normalized.find((x) => x.norm === 'up') ??
    normalized.find((x) => x.norm === 'yes') ??
    normalized[0];
  const downCandidate =
    normalized.find((x) => x.norm === 'down') ??
    normalized.find((x) => x.norm === 'no') ??
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

function formatHourForSlug(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function slugFor15m(startTs: number): string {
  return `btc-updown-15m-${startTs}`;
}

function slugCandidatesFor1h(startTs: number): string[] {
  const d = new Date(startTs * 1000);
  const month = d
    .toLocaleString('en-US', { timeZone: ET, month: 'long' })
    .toLowerCase();
  const day = d.toLocaleString('en-US', { timeZone: ET, day: 'numeric' });
  const year = d.toLocaleString('en-US', { timeZone: ET, year: 'numeric' });
  const hour = parseInt(
    d.toLocaleString('en-US', { timeZone: ET, hour: 'numeric', hour12: false }),
    10,
  );
  const hourStr = formatHourForSlug(hour);
  return [
    `bitcoin-up-or-down-${month}-${day}-${year}-${hourStr}-et`,
    `bitcoin-up-or-down-${month}-${day}-${hourStr}-et`,
  ];
}

function slugFor4h(startTs: number): string {
  return `btc-updown-4h-${startTs}`;
}

function slugCandidatesFor1d(startTs: number): string[] {
  const d = new Date(startTs * 1000);
  const month = d
    .toLocaleString('en-US', { timeZone: ET, month: 'long' })
    .toLowerCase();
  const day = d.toLocaleString('en-US', { timeZone: ET, day: 'numeric' });
  const year = d.toLocaleString('en-US', { timeZone: ET, year: 'numeric' });
  return [
    `bitcoin-up-or-down-on-${month}-${day}-${year}`,
    `bitcoin-up-or-down-on-${month}-${day}`,
  ];
}

function get15mStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  return Math.floor(nowUtc / 900) * 900 - n * 900;
}

function get1hStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  return Math.floor(nowUtc / 3600) * 3600 - n * 3600;
}

function getEtToUtcOffsetSec(): number {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const g = (type: string) => {
    const v = parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    return type === 'hour' && v === 24 ? 0 : v;
  };
  const etAsUtcMs = Date.UTC(
    g('year'),
    g('month') - 1,
    g('day'),
    g('hour'),
    g('minute'),
    g('second'),
  );
  return Math.round((now.getTime() - etAsUtcMs) / 1000);
}

function get4hStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  const offsetSec = getEtToUtcOffsetSec();
  const nowEt = nowUtc - offsetSec;
  const midnightEt = Math.floor(nowEt / 86400) * 86400;
  const secSinceMidnight = nowEt - midnightEt;
  const currentBlockIdx = Math.floor(secSinceMidnight / (4 * 3600));
  const currentBlockStartEt = midnightEt + currentBlockIdx * 4 * 3600;
  const targetBlockStartEt = currentBlockStartEt - n * 4 * 3600;
  return targetBlockStartEt + offsetSec;
}

function get1dStartNAgo(n: number): number {
  const nowUtc = Math.floor(Date.now() / 1000);
  const offsetSec = getEtToUtcOffsetSec();
  const nowEt = nowUtc - offsetSec;
  const midnightEt = Math.floor(nowEt / 86400) * 86400;
  const targetMidnightEt = midnightEt - n * 86400;
  return targetMidnightEt + offsetSec;
}

async function fetchWithRetry(
  url: string,
  params: Record<string, unknown>,
  retries = 2,
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) sp.set(k, String(v));
      }
      const qs = sp.toString();
      const fullUrl = qs ? `${url}?${qs}` : url;
      const res = await fetch(fullUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

async function fetchMarketBySlug(slug: string): Promise<GammaMarket | null> {
  try {
    const data = await fetchWithRetry(
      `${GAMMA_API_BASE}/markets/slug/${slug}`,
      {},
    );
    return data && typeof data === 'object' ? (data as GammaMarket) : null;
  } catch {
    return null;
  }
}

async function fetchEventBySlug(slug: string): Promise<GammaEvent | null> {
  try {
    const data = await fetchWithRetry(`${GAMMA_API_BASE}/events`, { slug });
    if (Array.isArray(data) && data.length) return data[0] as GammaEvent;
    return null;
  } catch {
    return null;
  }
}

async function fetchTokenPriceHistory(
  tokenId: string,
  startTs: number,
  endTs: number,
) {
  try {
    const data = await fetchWithRetry(`${CLOB_API_BASE}/prices-history`, {
      market: tokenId,
      startTs,
      endTs,
      fidelity: 1,
    });
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as any).history)
    ) {
      return { history: (data as any).history as PricePoint[] };
    }
    return null;
  } catch {
    return null;
  }
}

function labelLocalRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const start = s.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = e.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${start} → ${end}`;
}

@Injectable()
export class MarketsService {
  private cache = new Map<string, { builtAt: number; data: MarketDataFile }>();

  private countForDays(tf: '15m' | '1h' | '4h' | '1d', days: number) {
    if (tf === '15m') return days * 96;
    if (tf === '1h') return days * 24;
    if (tf === '4h') return days * 6;
    return days;
  }

  private durationSec(tf: '15m' | '1h' | '4h' | '1d') {
    if (tf === '15m') return 900;
    if (tf === '1h') return 3600;
    if (tf === '4h') return 14400;
    return 86400;
  }

  private startGen(tf: '15m' | '1h' | '4h' | '1d') {
    if (tf === '15m') return get15mStartNAgo;
    if (tf === '1h') return get1hStartNAgo;
    if (tf === '4h') return get4hStartNAgo;
    return get1dStartNAgo;
  }

  private async buildDataset(tf: '15m' | '1h' | '4h' | '1d', days: number) {
    const key = `${tf}:${days}`;
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && now - cached.builtAt < 10 * 60 * 1000) return cached.data;

    const count = this.countForDays(tf, days);
    const dur = this.durationSec(tf);
    const startGen = this.startGen(tf);

    const bundles: MarketBundle[] = [];
    for (let n = count; n >= 1; n--) {
      const startTs = startGen(n);
      const endTs = startTs + dur;

      if (tf === '15m') {
        const slug = slugFor15m(startTs);
        const market = await fetchMarketBySlug(slug);
        if (!market) continue;
        const outcomes = parseArray(market.outcomes, String);
        const tokenIds = parseArray(market.clobTokenIds, String);
        const tokens = pickUpDownTokens(outcomes, tokenIds);
        if (!tokens.up) continue;
        const yesTokenHistory = await fetchTokenPriceHistory(
          tokens.up.tokenId,
          startTs,
          endTs,
        );
        const startIso = new Date(startTs * 1000).toISOString();
        const endIso = new Date(endTs * 1000).toISOString();
        bundles.push({
          slug,
          title: null,
          startTs,
          endTs,
          startIso,
          endIso,
          labelLocal: labelLocalRange(startIso, endIso),
          labelUTC: `${startIso} → ${endIso}`,
          tokens: { yes: tokens.up, no: tokens.down },
          yesTokenHistory,
        });
      } else if (tf === '1h') {
        const candidates = slugCandidatesFor1h(startTs);
        let matchedSlug = candidates[0]!;
        let event: GammaEvent | null = null;
        for (const c of candidates) {
          event = await fetchEventBySlug(c);
          if (event?.markets?.length) {
            matchedSlug = c;
            break;
          }
        }
        if (!event?.markets?.length) continue;
        const market = event.markets[0]!;
        const outcomes = parseArray(market.outcomes, String);
        const tokenIds = parseArray(market.clobTokenIds, String);
        const tokens = pickUpDownTokens(outcomes, tokenIds);
        if (!tokens.up) continue;
        const yesTokenHistory = await fetchTokenPriceHistory(
          tokens.up.tokenId,
          startTs,
          endTs,
        );
        const startIso = new Date(startTs * 1000).toISOString();
        const endIso = new Date(endTs * 1000).toISOString();
        bundles.push({
          slug: matchedSlug,
          title: event.title ?? null,
          startTs,
          endTs,
          startIso,
          endIso,
          labelLocal: labelLocalRange(startIso, endIso),
          labelUTC: `${startIso} → ${endIso}`,
          tokens: { yes: tokens.up, no: tokens.down },
          yesTokenHistory,
        });
      } else if (tf === '4h') {
        const slug = slugFor4h(startTs);
        const event = await fetchEventBySlug(slug);
        if (!event?.markets?.length) continue;
        const market = event.markets[0]!;
        const outcomes = parseArray(market.outcomes, String);
        const tokenIds = parseArray(market.clobTokenIds, String);
        const tokens = pickUpDownTokens(outcomes, tokenIds);
        if (!tokens.up) continue;
        const yesTokenHistory = await fetchTokenPriceHistory(
          tokens.up.tokenId,
          startTs,
          endTs,
        );
        const startIso = new Date(startTs * 1000).toISOString();
        const endIso = new Date(endTs * 1000).toISOString();
        bundles.push({
          slug,
          title: event.title ?? null,
          startTs,
          endTs,
          startIso,
          endIso,
          labelLocal: labelLocalRange(startIso, endIso),
          labelUTC: `${startIso} → ${endIso}`,
          tokens: { yes: tokens.up, no: tokens.down },
          yesTokenHistory,
        });
      } else {
        const candidates = slugCandidatesFor1d(startTs);
        let matchedSlug = candidates[0]!;
        let event: GammaEvent | null = null;
        for (const c of candidates) {
          event = await fetchEventBySlug(c);
          if (event?.markets?.length) {
            matchedSlug = c;
            break;
          }
        }
        if (!event?.markets?.length) continue;
        const market = event.markets[0]!;
        const outcomes = parseArray(market.outcomes, String);
        const tokenIds = parseArray(market.clobTokenIds, String);
        const tokens = pickUpDownTokens(outcomes, tokenIds);
        if (!tokens.up) continue;
        const yesTokenHistory = await fetchTokenPriceHistory(
          tokens.up.tokenId,
          startTs,
          endTs,
        );
        const startIso = new Date(startTs * 1000).toISOString();
        const endIso = new Date(endTs * 1000).toISOString();
        bundles.push({
          slug: matchedSlug,
          title: event.title ?? null,
          startTs,
          endTs,
          startIso,
          endIso,
          labelLocal: labelLocalRange(startIso, endIso),
          labelUTC: `${startIso} → ${endIso}`,
          tokens: { yes: tokens.up, no: tokens.down },
          yesTokenHistory,
        });
      }

      await new Promise((r) => setTimeout(r, 120));
    }

    bundles.sort((a, b) => a.startTs - b.startTs);
    const out: MarketDataFile = {
      generatedAt: new Date().toISOString(),
      timeframe: tf,
      range: {
        markets: bundles.length,
        startTs: bundles[0]?.startTs ?? null,
        endTs: bundles[bundles.length - 1]?.endTs ?? null,
      },
      markets: bundles,
    };

    this.cache.set(key, { builtAt: now, data: out });
    return out;
  }

  async listMarkets(input: {
    timeframe: '15m' | '1h' | '4h' | '1d';
    days: number;
    status: 'active' | 'resolved' | 'all';
    limit: number;
    offset: number;
  }) {
    const dataset = await this.buildDataset(input.timeframe, input.days);
    const nowSec = Math.floor(Date.now() / 1000);
    const filtered = dataset.markets.filter((m) => {
      const resolved = m.endTs <= nowSec;
      if (input.status === 'all') return true;
      if (input.status === 'resolved') return resolved;
      return !resolved;
    });

    const slice = filtered
      .slice(input.offset, input.offset + input.limit)
      .map((m) => ({
        slug: m.slug,
        title: m.title,
        startTs: m.startTs,
        endTs: m.endTs,
        labelLocal: m.labelLocal,
        resolved: m.endTs <= nowSec,
      }));

    const startTs = filtered[0]?.startTs ?? null;
    const endTs = filtered[filtered.length - 1]?.endTs ?? null;
    return {
      generatedAt: dataset.generatedAt,
      timeframe: dataset.timeframe,
      range: { markets: filtered.length, startTs, endTs },
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
      markets: slice,
    };
  }

  async getMarket(slug: string) {
    // Try to find in any cached dataset first.
    for (const v of this.cache.values()) {
      const hit = v.data.markets.find((m) => m.slug === slug);
      if (hit) return { market: hit };
    }
    // Fallback: fetch minimal by slug (no guarantees for start/end, but good enough for chart if found).
    const market = await fetchMarketBySlug(slug);
    if (market) return { market };
    const event = await fetchEventBySlug(slug);
    return { market: event };
  }

  async getPricesHistory(tokenId: string, startTs: number, endTs: number) {
    const h = await fetchTokenPriceHistory(tokenId, startTs, endTs);
    return { tokenId, startTs, endTs, yesTokenHistory: h };
  }
}
