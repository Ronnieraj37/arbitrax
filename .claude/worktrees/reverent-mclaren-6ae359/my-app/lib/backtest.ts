export type Market = {
  slug: string;
  startTs: number;
  endTs: number;
  yesTokenHistory?: { history: { t: number; p: number }[] };
  /** Source timeframe from the data file (e.g. "15m", "1h", "4h", "1d").
   *  When present, used instead of heuristic duration detection. */
  sourceTimeframe?: string;
};

export type ParsedSignal = {
  timestamp: number;
  dir: "UP" | "DOWN";
  exitTimestamp?: number;
};

export type MatchedTrade = {
  dtUtc: number;
  dir: "UP" | "DOWN";
  slug: string;
  tokenUsed: "YES" | "NO";
  startPrice: number;
  minPrice: number;
  endPrice: number;
  /** Max adverse excursion as a fraction of entry price (0.10 = -10%) */
  worstDrawdown: number;
  result: "WIN" | "LOSS";
  /** ROI per $1 stake (e.g. 0.20 = +20%, -1 = -100%) */
  tokenPnl: number;
  yesStart: number;
  noStart: number;
  holdTimeSec: number;
  marketTimeframe: string;
};

export type HourlyStat = {
  hour: number;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type ThresholdStat = {
  threshold: number;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type FilterCandidate = {
  entryLt: number;
  ddCapType: "abs" | "pct";
  ddCap: number;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgDd: number;
  p95Dd: number;
  maxDd: number;
};

export type ConservativeStat = {
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  coveragePct: number;
};

export type ScalpingAnalysis = {
  tradesPerHourAvg: number;
  tradesPerDayAvg: number;
  avgHoldTimeSec: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  sharpeRatio: number;
  profitFactor: number;
  avgTimeBetweenTradesSec: number;
  scalpingViability: "excellent" | "good" | "moderate" | "poor";
  recommendation: string;
};

export type MarketPerformance = {
  slug: string;
  timeOfDay: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgDrawdown: number;
};

export type TimeframeAnalysis = {
  timeframe: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  sharpeRatio: number;
};

export type BacktestSummary = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  avgDrawdown: number;
  totalPnlUsd: number;
  totalPnlUsd100: number;
};

/* ── CSV-native trade types ── */

export type CsvTrade = {
  tradeNum: number;
  direction: "LONG" | "SHORT";
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
};

export type CsvTradeAnalysis = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number;
  sharpeRatio: number;
  equity: number[];
  longTrades: number;
  shortTrades: number;
  longWinRate: number;
  shortWinRate: number;
  longPnl: number;
  shortPnl: number;
  avgHoldTimeSec: number;
  hourlyStats: { hour: number; trades: number; winRate: number; pnl: number }[];
  bestHours: { hour: number; trades: number; winRate: number; pnl: number }[];
  topWinners: CsvTrade[];
  topLosers: CsvTrade[];
  dateRange: string;
};

export type TpLevelStat = {
  tp: number;
  trades: number;
  hits: number;
  hitRate: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type EtHourlyStat = {
  hour: number;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type WeekdayStat = {
  day: string;
  dayIndex: number;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type FilterGridResult = {
  label: string;
  cfg: {
    direction?: "UP" | "DOWN" | "BOTH";
    maxEntryPrice?: number;
    hours?: number[];
    weekdays?: string[];
  };
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  sharpe: number;
};

export type EntryTimingStat = {
  bucket: string;
  minutesInto: number;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type Recommendation = {
  category: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  metric?: string;
};

export type BacktestConfig = {
  csvTimeframe: string;
  asset: "BTC" | "ETH";
  stakeUsd: number;
  /**
   * TradingView "process_orders_on_close" (aka "Process orders on bar close").
   * If true, the timestamp in the export is treated as the bar CLOSE, meaning the
   * actual entry happens on the NEXT bar.
   */
  processOrdersOnClose?: boolean;
  /**
   * Confirms the CSV datetimes are already in UTC (or include TZ offsets / Z).
   * If false, results may be invalid because naive timestamps are interpreted as UTC.
   */
  timestampsAreUtc?: boolean;
  /**
   * If true, keep multiple entries in the same market window (pyramiding).
   */
  allowMultipleEntriesSameMarket?: boolean;
  /**
   * How opposite-direction signals should be interpreted.
   * - close-only: opposite signal closes existing side only (no new entry)
   * - flip-side: opposite signal closes and opens opposite side
   * - additive-opposite: keep both sides as independent entries
   */
  oppositeSignalMode?: "close-only" | "flip-side" | "additive-opposite";
};

export type BacktestReport = {
  summary: BacktestSummary;
  equity: number[];
  matched: MatchedTrade[];
  hourly: HourlyStat[];
  bestHours: HourlyStat[];
  thresholdStats: ThresholdStat[];
  bestThreshold: ThresholdStat | null;
  conservative: ConservativeStat | null;
  filterCandidates: FilterCandidate[];
  topWinners: MatchedTrade[];
  topLosers: MatchedTrade[];
  scalping: ScalpingAnalysis | null;
  marketPerformance: MarketPerformance[];
  timeframeAnalysis: TimeframeAnalysis[];
  signalCount: number;
  matchRate: number;
  marketsCoverage: { total: number; withHistory: number; dateRange: string };
  csvAnalysis: CsvTradeAnalysis | null;
  usedMarketType: MarketType;
  fallbackUsed: boolean;
  tpAnalysis: TpLevelStat[];
  etHourly: EtHourlyStat[];
  weekdayStats: WeekdayStat[];
  filterGrid: { byPnl: FilterGridResult[]; byWr: FilterGridResult[] };
  entryTiming: EntryTimingStat[];
  recommendations: Recommendation[];
  config: BacktestConfig | null;
  dataQuality: {
    shiftedToNextBar: number;
    snappedToBoundary: number;
    skippedDuplicateSignals: number;
  };
};

type MarketRow = {
  start: number;
  end: number;
  slug: string;
  yesHistory: { t: number; p: number }[];
  yesStart: number;
  yesMin: number;
  yesMax: number;
  yesEnd: number;
  noStart: number;
  noMin: number;
  noMax: number;
  noEnd: number;
  timeframe: string;
};

export type MarketType = "15m" | "1h" | "4h" | "1d" | "all";

/* ── Column mapping for universal CSV parsing ── */

type ColumnMapping = {
  date: number;
  type: number;
  direction: number;
  price: number;
  pnl: number;
  pnlPct: number;
  tradeNum: number;
};

type CsvParseResult = {
  signals: ParsedSignal[];
  csvTrades: CsvTrade[];
  hasNativePnl: boolean;
};

/* ════════════════════════════════════════════════
   MAIN ENTRY POINT
   ════════════════════════════════════════════════ */

export function analyzeBacktest({
  tradesCsv,
  markets,
  marketType,
  stakeUsd = 1,
  config,
}: {
  tradesCsv: string;
  markets: Market[];
  marketType: MarketType;
  stakeUsd?: number;
  config?: BacktestConfig;
}): BacktestReport {
  // 1. Universal CSV parse
  const parseResult = parseUniversalCsv(tradesCsv);
  const { signals: normalizedSignals, stats: timingStats } =
    normalizeSignalsForMarketMatching(parseResult.signals, config);
  const parsedSignals = applySignalSemantics(normalizedSignals, config);

  // 2. CSV-native analysis (uses CSV's own P&L when available)
  const csvAnalysis =
    parseResult.csvTrades.length > 0
      ? buildCsvTradeAnalysis(parseResult.csvTrades)
      : null;

  // 3. Market matching via slug-based lookup (matches Python reference script)
  //    When a specific timeframe is selected, only try that timeframe's slugs.
  //    When "all" is selected, try each timeframe in order (most granular first).
  let usedMarketType = marketType;
  let marketRows = buildMarketRows(markets, marketType);
  marketRows.sort((a, b) => a.start - b.start);

  const timeframesToTry =
    marketType === "all" ? ["15m", "1h", "4h", "1d"] : [marketType];

  let matchedResult = matchSignalsToMarkets(
    parsedSignals,
    marketRows,
    timeframesToTry,
    !!config?.allowMultipleEntriesSameMarket,
  );
  let matched = matchedResult.matched;

  // Auto-fallback: if selected timeframe gave 0 matches but we have signals, try "all"
  if (
    matched.length === 0 &&
    parsedSignals.length > 0 &&
    marketType !== "all"
  ) {
    const allRows = buildMarketRows(markets, "all");
    allRows.sort((a, b) => a.start - b.start);
    const allMatchedResult = matchSignalsToMarkets(
      parsedSignals,
      allRows,
      ["15m", "1h", "4h", "1d"],
      !!config?.allowMultipleEntriesSameMarket,
    );
    if (allMatchedResult.matched.length > 0) {
      matchedResult = allMatchedResult;
      matched = allMatchedResult.matched;
      marketRows = allRows;
      usedMarketType = "all";
    }
  }

  const wins = matched.filter((m) => m.result === "WIN").length;
  const losses = matched.filter((m) => m.result === "LOSS").length;
  const total = matched.length;
  const totalPnl = matched.reduce((acc, m) => acc + m.tokenPnl, 0);
  const avgWin = wins
    ? matched
        .filter((m) => m.result === "WIN")
        .reduce((acc, m) => acc + m.tokenPnl, 0) / wins
    : 0;
  const avgLoss = losses
    ? matched
        .filter((m) => m.result === "LOSS")
        .reduce((acc, m) => acc + m.tokenPnl, 0) / losses
    : 0;
  const maxDrawdown = matched.length
    ? Math.max(...matched.map((m) => m.worstDrawdown))
    : 0;
  const avgDrawdown = matched.length
    ? matched.reduce((acc, m) => acc + m.worstDrawdown, 0) / matched.length
    : 0;
  const winRate = total ? wins / total : 0;
  const equity = buildEquity(matched);
  const hourly = buildHourlyStats(matched);
  const bestHours = hourly
    .filter((h) => h.trades >= 3)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);
  const thresholdStats = buildThresholdStats(matched);
  const bestThreshold =
    thresholdStats
      .filter((t) => t.trades >= 10)
      .sort((a, b) => b.avgPnl - a.avgPnl)[0] ?? null;
  const conservative = buildConservativeStats(matched);
  const filterCandidates = buildFilterCandidates(matched);
  const sortedByPnl = [...matched].sort((a, b) => b.tokenPnl - a.tokenPnl);
  const topWinners = sortedByPnl.slice(0, 10);
  const topLosers = sortedByPnl.slice(Math.max(sortedByPnl.length - 10, 0));

  const scalping = buildScalpingAnalysis(matched, parsedSignals);
  const marketPerformance = buildMarketPerformance(matched);
  const timeframeAnalysis = buildTimeframeAnalysis(matched);

  const marketsWithHistory = marketRows.filter((m) => m.yesStart > 0).length;
  const minTs = marketRows.length ? marketRows[0].start : 0;
  const maxTs = marketRows.length ? marketRows[marketRows.length - 1].end : 0;
  const dateRange =
    minTs && maxTs
      ? `${new Date(minTs * 1000).toISOString().slice(0, 10)} to ${new Date(maxTs * 1000).toISOString().slice(0, 10)}`
      : "none";

  const tpAnalysis = buildTpAnalysis(matched, marketRows, stakeUsd);
  const etHourly = buildEtHourlyStats(matched);
  const weekdayStats = buildWeekdayStats(matched);
  const filterGrid = buildFilterGrid(matched, stakeUsd);
  const entryTiming = buildEntryTimingAnalysis(matched, marketRows);
  const recommendations = buildRecommendations(
    matched,
    timeframeAnalysis,
    tpAnalysis,
    etHourly,
    weekdayStats,
    filterGrid,
    entryTiming,
    stakeUsd,
  );

  return {
    summary: {
      trades: total,
      wins,
      losses,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
      maxDrawdown,
      avgDrawdown,
      totalPnlUsd: totalPnl * stakeUsd,
      totalPnlUsd100: totalPnl * stakeUsd * 100,
    },
    equity,
    matched,
    hourly,
    bestHours,
    thresholdStats,
    bestThreshold,
    conservative,
    filterCandidates,
    topWinners,
    topLosers,
    scalping,
    marketPerformance,
    timeframeAnalysis,
    signalCount: parsedSignals.length,
    matchRate: parsedSignals.length ? total / parsedSignals.length : 0,
    marketsCoverage: {
      total: marketRows.length,
      withHistory: marketsWithHistory,
      dateRange,
    },
    csvAnalysis,
    usedMarketType,
    fallbackUsed: usedMarketType !== marketType,
    tpAnalysis,
    etHourly,
    weekdayStats,
    filterGrid,
    entryTiming,
    recommendations,
    config: config ?? null,
    dataQuality: {
      shiftedToNextBar: timingStats.shiftedToNextBar,
      snappedToBoundary: timingStats.snappedToBoundary,
      skippedDuplicateSignals: matchedResult.skippedDuplicateSignals,
    },
  };
}

/* ── Slug-based market matching (matches Python reference script logic) ── */

const ET_TIMEZONE = "America/New_York";

function fmtHourSlug(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/** Get UTC-to-ET offset for a given UTC epoch (handles DST) */
function getEtOffsetSec(utcTs: number): number {
  const d = new Date(utcTs * 1000);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const g = (type: string) => {
    const v = parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
    return type === "hour" && v === 24 ? 0 : v;
  };
  const etAsUtcMs = Date.UTC(
    g("year"),
    g("month") - 1,
    g("day"),
    g("hour"),
    g("minute"),
    g("second"),
  );
  return Math.round((utcTs * 1000 - etAsUtcMs) / 1000);
}

/**
 * Generate slug candidates for a signal at the given UTC timestamp.
 * Returns new format (with year) first, then old format (without year).
 */
function signalToSlugs(signalTs: number, timeframe: string): string[] {
  switch (timeframe) {
    case "15m": {
      const windowStart = Math.floor(signalTs / 900) * 900;
      return [`btc-updown-15m-${windowStart}`];
    }
    case "1h": {
      const windowStart = Math.floor(signalTs / 3600) * 3600;
      const d = new Date(windowStart * 1000);
      const month = d
        .toLocaleString("en-US", { timeZone: ET_TIMEZONE, month: "long" })
        .toLowerCase();
      const day = d.toLocaleString("en-US", {
        timeZone: ET_TIMEZONE,
        day: "numeric",
      });
      const year = d.toLocaleString("en-US", {
        timeZone: ET_TIMEZONE,
        year: "numeric",
      });
      let hour = parseInt(
        d.toLocaleString("en-US", {
          timeZone: ET_TIMEZONE,
          hour: "numeric",
          hour12: false,
        }),
        10,
      );
      if (hour === 24) hour = 0;
      const h = fmtHourSlug(hour);
      return [
        `bitcoin-up-or-down-${month}-${day}-${year}-${h}-et`,
        `bitcoin-up-or-down-${month}-${day}-${h}-et`,
      ];
    }
    case "4h": {
      const offset = getEtOffsetSec(signalTs);
      const etSec = signalTs - offset;
      const midnightEt = Math.floor(etSec / 86400) * 86400;
      const secSinceMidnight = etSec - midnightEt;
      const blockIdx = Math.floor(secSinceMidnight / 14400);
      const blockStartEt = midnightEt + blockIdx * 14400;
      const blockStartUtc = blockStartEt + offset;
      return [`btc-updown-4h-${blockStartUtc}`];
    }
    case "1d": {
      const d = new Date(signalTs * 1000);
      const month = d
        .toLocaleString("en-US", { timeZone: ET_TIMEZONE, month: "long" })
        .toLowerCase();
      const day = d.toLocaleString("en-US", {
        timeZone: ET_TIMEZONE,
        day: "numeric",
      });
      const year = d.toLocaleString("en-US", {
        timeZone: ET_TIMEZONE,
        year: "numeric",
      });
      return [
        `bitcoin-up-or-down-on-${month}-${day}-${year}`,
        `bitcoin-up-or-down-on-${month}-${day}`,
      ];
    }
    default:
      return [];
  }
}

/**
 * Match signals to markets using slug-based lookup (primary) with binary
 * search fallback. This matches the approach used by the Python reference
 * script: for each signal, compute the expected market slug, look it up
 * directly, and check if the market resolved in the predicted direction.
 *
 * When timeframesToTry has multiple entries (e.g. "all" mode), each signal
 * is matched to the most granular available timeframe in order.
 */
function matchSignalsToMarkets(
  signals: ParsedSignal[],
  marketRows: MarketRow[],
  timeframesToTry: string[],
  allowMultipleEntriesSameMarket: boolean,
): { matched: MatchedTrade[]; skippedDuplicateSignals: number } {
  // Build slug → MarketRow map for O(1) lookup
  const slugMap = new Map<string, MarketRow>();
  for (const row of marketRows) {
    if (!slugMap.has(row.slug)) {
      slugMap.set(row.slug, row);
    }
  }

  const matched: MatchedTrade[] = [];
  const usedKeys = new Set<string>();
  let skippedDuplicateSignals = 0;
  for (const sig of signals) {
    let row: MarketRow | undefined;

    for (const tf of timeframesToTry) {
      const candidates = signalToSlugs(sig.timestamp, tf);
      for (const candidate of candidates) {
        row = slugMap.get(candidate);
        if (row) break;
      }
      if (row) break;
    }

    // Fallback: binary search (only if slug lookup failed)
    if (!row) {
      row = findMarketForSignal(marketRows, sig.timestamp);
    }

    if (!row) continue;

    // If multiple signals fall into the same market window (common when matching
    // 5m/15m strategies against 1h/1d markets), keep the earliest and skip the rest.
    // We key by market slug + direction to still allow opposite signals across the same
    // market (user can filter in analysis).
    if (!allowMultipleEntriesSameMarket) {
      const key = `${row.slug}:${sig.dir}`;
      if (usedKeys.has(key)) {
        skippedDuplicateSignals++;
        continue;
      }
      usedKeys.add(key);
    }

    const tokenUsed = sig.dir === "UP" ? "YES" : "NO";
    const startPrice = sig.dir === "UP" ? row.yesStart : row.noStart;
    const minPrice = sig.dir === "UP" ? row.yesMin : row.noMin;
    const endPrice = sig.dir === "UP" ? row.yesEnd : row.noEnd;
    const worstDrawdown =
      startPrice > 0 ? Math.max(0, (startPrice - minPrice) / startPrice) : 0;

    // Exit-aware settlement:
    // - If CSV exit happens before market end, settle on nearest in-market token price.
    // - If exit is missing/after market end, settle at market resolution.
    const hasCsvExit =
      typeof sig.exitTimestamp === "number" && Number.isFinite(sig.exitTimestamp);
    const boundedExit = hasCsvExit ? Math.min(sig.exitTimestamp!, row.end) : row.end;
    const effectiveExitTs = Math.max(sig.timestamp, boundedExit);
    const exitedBeforeResolution = effectiveExitTs < row.end;

    let tokenPnl = 0;
    let result: "WIN" | "LOSS" = "LOSS";
    let realizedEndPrice = endPrice;

    if (startPrice > 0) {
      if (exitedBeforeResolution) {
        const yesAtExit = nearestYesPriceAt(row.yesHistory, effectiveExitTs) ?? row.yesEnd;
        const tokenExit = sig.dir === "UP" ? yesAtExit : 1 - yesAtExit;
        realizedEndPrice = tokenExit;
        tokenPnl = tokenExit / startPrice - 1;
        result = tokenPnl >= 0 ? "WIN" : "LOSS";
      } else {
        const resolvedUp = row.yesEnd > 0.5;
        const correct =
          (sig.dir === "UP" && resolvedUp) || (sig.dir === "DOWN" && !resolvedUp);
        result = correct ? "WIN" : "LOSS";
        tokenPnl = result === "WIN" ? 1 / startPrice - 1 : -1;
      }
    }
    const holdTimeSec = effectiveExitTs - sig.timestamp;

    matched.push({
      dtUtc: sig.timestamp,
      dir: sig.dir,
      slug: row.slug,
      tokenUsed,
      startPrice,
      minPrice,
      endPrice: realizedEndPrice,
      worstDrawdown,
      result,
      tokenPnl,
      yesStart: row.yesStart,
      noStart: row.noStart,
      holdTimeSec: Math.max(0, holdTimeSec),
      marketTimeframe: row.timeframe,
    });
  }
  return { matched, skippedDuplicateSignals };
}

function applySignalSemantics(
  signals: ParsedSignal[],
  config?: BacktestConfig,
): ParsedSignal[] {
  if (!signals.length) return [];
  const allowPyramiding = !!config?.allowMultipleEntriesSameMarket;

  let position: "UP" | "DOWN" | null = null;
  const out: ParsedSignal[] = [];

  for (const s of signals) {
    if (position === null) {
      out.push(s);
      position = s.dir;
      continue;
    }

    if (s.dir === position) {
      if (allowPyramiding) out.push(s);
      continue;
    }

    // Opposite-direction signal: treat as close+flip.
    out.push(s);
    position = s.dir;
  }

  return out;
}

/* ════════════════════════════════════════════════
   UNIVERSAL CSV PARSER
   ════════════════════════════════════════════════ */

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function parseUniversalCsv(text: string): CsvParseResult {
  const clean = stripBom(text);
  const lines = clean.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2)
    return { signals: [], csvTrades: [], hasNativePnl: false };

  const headers = safeSplitCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
  const mapping = detectColumns(headers);

  // TradingView format: has trade numbers + type column (entry/exit pairs)
  const hasTradePairs = mapping.tradeNum >= 0 && mapping.type >= 0;

  if (hasTradePairs) {
    return parseTradingViewUniversal(lines, mapping);
  }

  return parseGenericUniversal(lines, headers, mapping);
}

/** Backward-compatible wrapper */
export function parseSignalsCsv(text: string): ParsedSignal[] {
  return parseUniversalCsv(text).signals;
}

/* ── Column detection ── */

function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: -1,
    type: -1,
    direction: -1,
    price: -1,
    pnl: -1,
    pnlPct: -1,
    tradeNum: -1,
  };

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];

    // Trade number
    if (
      mapping.tradeNum === -1 &&
      /^(trade\s*[#no]|#|id|order\s*id|trade\s*id|trade\s*number)$/i.test(h)
    ) {
      mapping.tradeNum = i;
      continue;
    }

    // Date/time (take first match)
    if (mapping.date === -1 && /date|time|datetime|timestamp|^ts$/i.test(h)) {
      mapping.date = i;
      continue;
    }

    // Type (combined field like "Entry short")
    if (mapping.type === -1 && /^type$/i.test(h)) {
      mapping.type = i;
      continue;
    }

    // Direction / signal (separate field)
    if (
      mapping.direction === -1 &&
      /^(signal|side|direction|action|order\s*type|trade\s*type|position|buy[\/.]sell|long[\/.]short|b[\/.]s)$/i.test(
        h,
      )
    ) {
      mapping.direction = i;
      continue;
    }

    // P&L percentage (check before absolute to avoid false match)
    if (
      mapping.pnlPct === -1 &&
      /p[&\/n]l\s*%|net\s*p[&\/n]l\s*%|return\s*%|profit\s*%/i.test(h)
    ) {
      mapping.pnlPct = i;
      continue;
    }

    // P&L absolute
    if (
      mapping.pnl === -1 &&
      /net\s*p[&\/n]l\s*(usd|\$)|^p[&\/n]l$|^profit(\/loss)?$|^net\s*p[&\/n]l$|^realized\s*p[&\/n]l$|^result$|^return$/i.test(
        h,
      )
    ) {
      mapping.pnl = i;
      continue;
    }

    // Price
    if (
      mapping.price === -1 &&
      /^(price|entry\s*price|open\s*price|open|rate|fill\s*price|avg\s*price|price\s*usd)$/i.test(
        h,
      )
    ) {
      mapping.price = i;
      continue;
    }
  }

  // Fallback: if no direction column but type column has direction info, use type
  // If no date column found, try broader scan
  if (mapping.date === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (
        i !== mapping.tradeNum &&
        i !== mapping.type &&
        i !== mapping.direction &&
        /open\s*date|entry\s*date|trade\s*date|^when$/i.test(headers[i])
      ) {
        mapping.date = i;
        break;
      }
    }
  }

  return mapping;
}

/* ── Direction detection ── */

function detectDirection(value: string): "LONG" | "SHORT" | null {
  if (!value) return null;
  const v = value.trim();
  const lower = v.toLowerCase();

  // Compound types: "entry long", "open short", etc.
  if (/entry\s+long|open\s+long|buy\s+long/i.test(lower)) return "LONG";
  if (/entry\s+short|open\s+short|sell\s+short/i.test(lower)) return "SHORT";

  // Word-boundary matches
  if (/\b(long|buy|up|call|bullish|bull)\b/i.test(lower)) return "LONG";
  if (/\b(short|sell|down|put|bearish|bear)\b/i.test(lower)) return "SHORT";

  // Symbol / emoji matches
  if (/^[↑⬆▲△▴🟢\^+>]{1,2}$/.test(v)) return "LONG";
  if (/^[↓⬇▼▽▾🔴v\-<]{1,2}$/.test(v)) return "SHORT";

  // Numeric: 1 = long, 0 or -1 = short
  if (v === "1" || v === "+1") return "LONG";
  if (v === "0" || v === "-1") return "SHORT";

  return null;
}

function isEntryRow(typeValue: string): boolean {
  const t = typeValue.toLowerCase();
  return (
    /entry|open\b|^buy$|^sell$|^long$|^short$/i.test(t) &&
    !/exit|close|resolution|tp\b|sl\b|stop\s*loss|take\s*profit/i.test(t)
  );
}

function isExitRow(typeValue: string): boolean {
  const t = typeValue.toLowerCase();
  return /exit|close|resolution|tp\b|sl\b|stop\s*loss|take\s*profit/i.test(t);
}

/* ── TradingView format parser (entry/exit pairs with optional P&L) ── */

function parseTradingViewUniversal(
  lines: string[],
  mapping: ColumnMapping,
): CsvParseResult {
  type RawRow = {
    tradeNum: number;
    isEntry: boolean;
    direction: "LONG" | "SHORT" | null;
    time: number;
    price: number;
    pnl: number;
    pnlPct: number;
  };

  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = safeSplitCsvLine(lines[i]);
    const tradeNumRaw = parts[mapping.tradeNum] ?? "";
    const tradeNum = parseInt(tradeNumRaw, 10);
    if (isNaN(tradeNum)) continue;

    const typeVal = parts[mapping.type] ?? "";
    const entry = isEntryRow(typeVal);
    const exit = isExitRow(typeVal);
    if (!entry && !exit) continue;

    // Direction: from type column first, then direction/signal column
    let dir = detectDirection(typeVal);
    if (!dir && mapping.direction >= 0) {
      dir = detectDirection(parts[mapping.direction] ?? "");
    }

    // Date
    const dateVal = mapping.date >= 0 ? (parts[mapping.date] ?? "") : "";
    const ts = parseToUtcSeconds(dateVal);
    if (!ts) continue;

    // Price
    const priceVal = mapping.price >= 0 ? (parts[mapping.price] ?? "") : "";
    const price = parseFloat(priceVal.replace(/[,$]/g, "")) || 0;

    // P&L
    const pnlVal = mapping.pnl >= 0 ? (parts[mapping.pnl] ?? "") : "";
    const pnl = parseFloat(pnlVal.replace(/[,$]/g, "")) || 0;

    const pnlPctVal = mapping.pnlPct >= 0 ? (parts[mapping.pnlPct] ?? "") : "";
    const pnlPct = parseFloat(pnlPctVal.replace(/[,%]/g, "")) || 0;

    rows.push({
      tradeNum,
      isEntry: entry,
      direction: dir,
      time: ts,
      price,
      pnl,
      pnlPct,
    });
  }

  // Group by trade number
  const byNum = new Map<number, RawRow[]>();
  for (const r of rows) {
    const list = byNum.get(r.tradeNum) ?? [];
    list.push(r);
    byNum.set(r.tradeNum, list);
  }

  const signals: ParsedSignal[] = [];
  const csvTrades: CsvTrade[] = [];
  let hasAnyPnl = false;

  for (const [num, group] of byNum) {
    const entryRow = group.find((r) => r.isEntry);
    const exitRow = group.find((r) => !r.isEntry);
    if (!entryRow) continue;

    // Direction: from entry row, fallback to exit row
    const direction = entryRow.direction ?? exitRow?.direction ?? null;
    if (!direction) continue;

    // Signal for market matching
    const dir: "UP" | "DOWN" = direction === "LONG" ? "UP" : "DOWN";
    signals.push({ timestamp: entryRow.time, dir, exitTimestamp: exitRow?.time });

    // Full trade (when we have exit data)
    if (exitRow) {
      const pnl = entryRow.pnl || exitRow.pnl;
      const pnlPct = entryRow.pnlPct || exitRow.pnlPct;
      if (pnl !== 0 || pnlPct !== 0) hasAnyPnl = true;

      csvTrades.push({
        tradeNum: num,
        direction,
        entryTime: entryRow.time,
        exitTime: exitRow.time,
        entryPrice: entryRow.price,
        exitPrice: exitRow.price,
        pnl,
        pnlPct,
      });
    }
  }

  signals.sort((a, b) => a.timestamp - b.timestamp);
  csvTrades.sort((a, b) => a.entryTime - b.entryTime);

  return { signals, csvTrades, hasNativePnl: hasAnyPnl };
}

/* ── Generic format parser (single-row signals or trades) ── */

function parseGenericUniversal(
  lines: string[],
  headers: string[],
  mapping: ColumnMapping,
): CsvParseResult {
  // Try to find date and direction columns, even with non-standard names
  let dateIdx = mapping.date;
  let dirIdx = mapping.direction >= 0 ? mapping.direction : mapping.type;

  // If still no direction column, scan all columns for direction-like values
  if (dirIdx < 0) {
    for (let col = 0; col < headers.length; col++) {
      if (col === dateIdx) continue;
      // Sample first data row to see if this column has direction values
      const parts = safeSplitCsvLine(lines[1]);
      if (parts[col] && detectDirection(parts[col])) {
        dirIdx = col;
        break;
      }
    }
  }

  // If still no date column, try to find a column with parseable dates
  if (dateIdx < 0) {
    for (let col = 0; col < headers.length; col++) {
      if (col === dirIdx) continue;
      const parts = safeSplitCsvLine(lines[1]);
      if (parts[col] && parseToUtcSeconds(parts[col])) {
        dateIdx = col;
        break;
      }
    }
  }

  const signals: ParsedSignal[] = [];
  const csvTrades: CsvTrade[] = [];
  let hasAnyPnl = false;

  for (let i = 1; i < lines.length; i++) {
    const parts = safeSplitCsvLine(lines[i]);

    // Date
    const dateVal = dateIdx >= 0 ? (parts[dateIdx] ?? "") : "";
    const ts = parseToUtcSeconds(dateVal);
    if (!ts) continue;

    // Direction
    const dirVal = dirIdx >= 0 ? (parts[dirIdx] ?? "") : "";
    const direction = detectDirection(dirVal);
    if (!direction) continue;

    const dir: "UP" | "DOWN" = direction === "LONG" ? "UP" : "DOWN";
    signals.push({ timestamp: ts, dir });

    // If we have P&L data, build a CSV trade
    const pnlVal = mapping.pnl >= 0 ? (parts[mapping.pnl] ?? "") : "";
    const pnl = parseFloat(pnlVal.replace(/[,$]/g, "")) || 0;
    const pnlPctVal = mapping.pnlPct >= 0 ? (parts[mapping.pnlPct] ?? "") : "";
    const pnlPct = parseFloat(pnlPctVal.replace(/[,%]/g, "")) || 0;
    const priceVal = mapping.price >= 0 ? (parts[mapping.price] ?? "") : "";
    const price = parseFloat(priceVal.replace(/[,$]/g, "")) || 0;

    if (pnl !== 0 || pnlPct !== 0) {
      hasAnyPnl = true;
      csvTrades.push({
        tradeNum: i,
        direction,
        entryTime: ts,
        exitTime: ts,
        entryPrice: price,
        exitPrice: price,
        pnl,
        pnlPct,
      });
    }
  }

  signals.sort((a, b) => a.timestamp - b.timestamp);
  csvTrades.sort((a, b) => a.entryTime - b.entryTime);

  return { signals, csvTrades, hasNativePnl: hasAnyPnl };
}

/* ════════════════════════════════════════════════
   CSV-NATIVE TRADE ANALYSIS
   ════════════════════════════════════════════════ */

function buildCsvTradeAnalysis(trades: CsvTrade[]): CsvTradeAnalysis {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const totalPnl = trades.reduce((acc, t) => acc + t.pnl, 0);
  const winRate = trades.length ? wins.length / trades.length : 0;
  const avgWin = wins.length
    ? wins.reduce((acc, t) => acc + t.pnl, 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? losses.reduce((acc, t) => acc + t.pnl, 0) / losses.length
    : 0;

  // Equity curve
  const equity: number[] = [0];
  let cumPnl = 0;
  let peak = 0;
  let maxDd = 0;
  let maxDdPct = 0;
  for (const t of trades) {
    cumPnl += t.pnl;
    equity.push(Number(cumPnl.toFixed(2)));
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDd) maxDd = dd;
    if (peak > 0) {
      const ddPct = dd / peak;
      if (ddPct > maxDdPct) maxDdPct = ddPct;
    }
  }

  // Profit factor
  const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor =
    grossLoss > 0
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
        ? Infinity
        : 0;

  // Sharpe ratio
  const pnls = trades.map((t) => t.pnl);
  const meanPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const variance =
    pnls.reduce((acc, p) => acc + (p - meanPnl) ** 2, 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio =
    stdDev > 0 ? Number(((meanPnl / stdDev) * Math.sqrt(252)).toFixed(2)) : 0;

  // Direction breakdown
  const longTrades = trades.filter((t) => t.direction === "LONG");
  const shortTrades = trades.filter((t) => t.direction === "SHORT");
  const longWins = longTrades.filter((t) => t.pnl > 0).length;
  const shortWins = shortTrades.filter((t) => t.pnl > 0).length;

  // Hold time
  const avgHoldTimeSec =
    trades.length > 0
      ? Math.round(
          trades.reduce(
            (acc, t) => acc + Math.max(0, t.exitTime - t.entryTime),
            0,
          ) / trades.length,
        )
      : 0;

  // Hourly stats
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    trades: 0,
    wins: 0,
    pnl: 0,
  }));
  for (const t of trades) {
    const hour = new Date(t.entryTime * 1000).getUTCHours();
    hourBuckets[hour].trades++;
    hourBuckets[hour].pnl += t.pnl;
    if (t.pnl > 0) hourBuckets[hour].wins++;
  }
  const hourlyStats = hourBuckets.map((b) => ({
    hour: b.hour,
    trades: b.trades,
    winRate: b.trades ? b.wins / b.trades : 0,
    pnl: Number(b.pnl.toFixed(2)),
  }));
  const bestHours = hourlyStats
    .filter((h) => h.trades >= 3)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  // Top winners/losers
  const sortedByPnl = [...trades].sort((a, b) => b.pnl - a.pnl);
  const topWinners = sortedByPnl.slice(0, 10);
  const topLosers = sortedByPnl.slice(Math.max(sortedByPnl.length - 10, 0));

  // Date range
  const first = trades[0];
  const last = trades[trades.length - 1];
  const dateRange =
    first && last
      ? `${new Date(first.entryTime * 1000).toISOString().slice(0, 10)} to ${new Date(last.entryTime * 1000).toISOString().slice(0, 10)}`
      : "unknown";

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    totalPnl: Number(totalPnl.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    maxDrawdown: Number(maxDd.toFixed(2)),
    maxDrawdownPct: Number(maxDdPct.toFixed(4)),
    profitFactor,
    sharpeRatio,
    equity,
    longTrades: longTrades.length,
    shortTrades: shortTrades.length,
    longWinRate: longTrades.length ? longWins / longTrades.length : 0,
    shortWinRate: shortTrades.length ? shortWins / shortTrades.length : 0,
    longPnl: Number(longTrades.reduce((acc, t) => acc + t.pnl, 0).toFixed(2)),
    shortPnl: Number(shortTrades.reduce((acc, t) => acc + t.pnl, 0).toFixed(2)),
    avgHoldTimeSec,
    hourlyStats,
    bestHours,
    topWinners,
    topLosers,
    dateRange,
  };
}

/* ════════════════════════════════════════════════
   MARKET MATCHING HELPERS (unchanged)
   ════════════════════════════════════════════════ */

function findMarketForSignal(
  sortedMarkets: MarketRow[],
  signalTs: number,
): MarketRow | undefined {
  let lo = 0;
  let hi = sortedMarkets.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedMarkets[mid].start <= signalTs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (result === -1) return undefined;
  const market = sortedMarkets[result];
  if (signalTs < market.end) return market;
  return undefined;
}

function detectMarketTimeframe(startTs: number, endTs: number): string {
  const durationSec = endTs - startTs;
  if (durationSec <= 1200) return "15m";
  if (durationSec <= 5400) return "1h";
  if (durationSec <= 18000) return "4h";
  return "1d";
}

function parseToUtcSeconds(value: string): number | null {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    const ts = num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    return ts > 0 ? ts : null;
  }
  const trimmed = value.trim();
  const match = trimmed.match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    const hh = Number(match[4]);
    const mm = Number(match[5]);
    const ss = Number(match[6] || "0");
    const ts = Date.UTC(y, m, d, hh, mm, ss);
    return Math.floor(ts / 1000);
  }
  // Try other date formats: DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY
  const slashMatch = trimmed.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (slashMatch) {
    let y = Number(slashMatch[3]);
    let m = Number(slashMatch[1]) - 1;
    let d = Number(slashMatch[2]);
    // If month > 12, swap (DD/MM format)
    if (m + 1 > 12) {
      m = Number(slashMatch[2]) - 1;
      d = Number(slashMatch[1]);
    }
    const hh = Number(slashMatch[4] || "0");
    const mm = Number(slashMatch[5] || "0");
    const ss = Number(slashMatch[6] || "0");
    const ts = Date.UTC(y, m, d, hh, mm, ss);
    return Math.floor(ts / 1000);
  }
  const normalized = /z|[+-]\d{2}:?\d{2}/i.test(trimmed)
    ? trimmed
    : `${trimmed} UTC`;
  const parsed = Date.parse(normalized);
  if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  return null;
}

/** Timeframe duration constants in seconds */
const TIMEFRAME_DURATION_SEC: Record<string, number> = {
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

const CSV_TIMEFRAME_DURATION_SEC: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

function snapToBoundary(
  ts: number,
  timeframeSec: number,
  toleranceSec: number,
) {
  if (timeframeSec <= 0) return { ts, snapped: false };
  const mod = ((ts % timeframeSec) + timeframeSec) % timeframeSec;
  if (mod <= toleranceSec) {
    return { ts: ts - mod, snapped: true };
  }
  if (timeframeSec - mod <= toleranceSec) {
    return { ts: ts + (timeframeSec - mod), snapped: true };
  }
  return { ts, snapped: false };
}

function normalizeSignalsForMarketMatching(
  signals: ParsedSignal[],
  config?: BacktestConfig,
): {
  signals: ParsedSignal[];
  stats: { shiftedToNextBar: number; snappedToBoundary: number };
} {
  const tf = config?.csvTimeframe ?? "15m";
  const timeframeSec = CSV_TIMEFRAME_DURATION_SEC[tf] ?? 0;
  const processOnClose = Boolean(config?.processOrdersOnClose);
  const toleranceSec = 2; // handles the common "00:15:01" drift

  let shiftedToNextBar = 0;
  let snappedToBoundary = 0;

  if (!timeframeSec) {
    return { signals, stats: { shiftedToNextBar, snappedToBoundary } };
  }

  const out = signals.map((s) => {
    let ts = s.timestamp;

    // snap small drifts to exact candle boundary first
    const snapped = snapToBoundary(ts, timeframeSec, toleranceSec);
    ts = snapped.ts;
    if (snapped.snapped) snappedToBoundary++;

    if (processOnClose) {
      // "orders on close": timestamp represents the bar close; entry is next bar open
      const next = Math.ceil(ts / timeframeSec) * timeframeSec;
      const shifted = next === ts ? ts + timeframeSec : next;
      if (shifted !== ts) shiftedToNextBar++;
      ts = shifted;
    } else {
      // "orders intra-bar": assume timestamp is within the entry bar
      ts = Math.floor(ts / timeframeSec) * timeframeSec;
    }

    return { ...s, timestamp: ts };
  });

  // keep chronological order after shifting
  out.sort((a, b) => a.timestamp - b.timestamp);
  return { signals: out, stats: { shiftedToNextBar, snappedToBoundary } };
}

function buildMarketRows(
  markets: Market[],
  marketType: MarketType,
): MarketRow[] {
  const rows: MarketRow[] = [];
  for (const m of markets) {
    const history = m.yesTokenHistory?.history ?? [];
    if (!history.length) continue;

    // Use sourceTimeframe (from data file) if available, fallback to heuristic
    const tf = m.sourceTimeframe ?? detectMarketTimeframe(m.startTs, m.endTs);
    if (marketType !== "all" && tf !== marketType) continue;

    // For 15m markets, the API returns startTs = market creation time (~24h before
    // resolution), NOT the 15-minute trading window start. The actual 15-min window
    // is [endTs - 900, endTs]. Similar correction for other timeframes where the
    // stored startTs is the creation time rather than the trading window.
    let windowStart = m.startTs;
    const expectedDuration = TIMEFRAME_DURATION_SEC[tf];
    if (expectedDuration) {
      const actualDuration = m.endTs - m.startTs;
      // If the actual duration is >2x the expected, startTs is the creation time
      if (actualDuration > expectedDuration * 2) {
        windowStart = m.endTs - expectedDuration;
      }
    }

    const sorted = [...history].sort((a, b) => a.t - b.t);

    // For 15m markets, only use price history within the actual trading window
    // (last 15 minutes before resolution), not the full 24h creation-to-resolution span
    const windowHistory =
      expectedDuration && tf === "15m"
        ? sorted.filter((h) => h.t >= windowStart && h.t <= m.endTs)
        : sorted;

    const historyToUse = windowHistory.length > 0 ? windowHistory : sorted;
    const yesPrices = historyToUse.map((h) => h.p);
    if (!yesPrices.length) continue;
    const noPrices = yesPrices.map((p) => 1 - p);

    rows.push({
      start: windowStart,
      end: m.endTs,
      slug: m.slug,
      yesHistory: historyToUse.map((h) => ({ t: h.t, p: h.p })),
      yesStart: yesPrices[0],
      yesMin: Math.min(...yesPrices),
      yesMax: Math.max(...yesPrices),
      yesEnd: yesPrices[yesPrices.length - 1],
      noStart: noPrices[0],
      noMin: Math.min(...noPrices),
      noMax: Math.max(...noPrices),
      noEnd: noPrices[noPrices.length - 1],
      timeframe: tf,
    });
  }
  return rows;
}

function nearestYesPriceAt(
  yesHistory: { t: number; p: number }[],
  ts: number,
): number | null {
  if (!yesHistory.length) return null;
  let lo = 0;
  let hi = yesHistory.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = yesHistory[mid].t;
    if (t === ts) return yesHistory[mid].p;
    if (t < ts) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const a = yesHistory[best];
  const b = yesHistory[Math.min(best + 1, yesHistory.length - 1)];
  if (!a) return null;
  if (!b) return a.p;
  return Math.abs(a.t - ts) <= Math.abs(b.t - ts) ? a.p : b.p;
}

/* ════════════════════════════════════════════════
   ANALYTICS HELPERS (unchanged)
   ════════════════════════════════════════════════ */

function buildEquity(matched: MatchedTrade[]): number[] {
  const sorted = [...matched].sort((a, b) => a.dtUtc - b.dtUtc);
  const equity: number[] = [0];
  let total = 0;
  for (const trade of sorted) {
    total += trade.tokenPnl;
    equity.push(Number(total.toFixed(4)));
  }
  return equity;
}

function buildHourlyStats(matched: MatchedTrade[]): HourlyStat[] {
  const buckets: HourlyStat[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    trades: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
  }));
  for (const trade of matched) {
    const hour = new Date(trade.dtUtc * 1000).getUTCHours();
    const bucket = buckets[hour];
    bucket.trades += 1;
    bucket.totalPnl += trade.tokenPnl;
    if (trade.result === "WIN") bucket.winRate += 1;
  }
  return buckets.map((b) => {
    const winRate = b.trades ? b.winRate / b.trades : 0;
    const avgPnl = b.trades ? b.totalPnl / b.trades : 0;
    return {
      hour: b.hour,
      trades: b.trades,
      winRate,
      totalPnl: Number(b.totalPnl.toFixed(4)),
      avgPnl: Number(avgPnl.toFixed(4)),
    };
  });
}

function buildThresholdStats(matched: MatchedTrade[]): ThresholdStat[] {
  const thresholds = [0.4, 0.45, 0.5, 0.55, 0.6];
  return thresholds.map((threshold) => {
    const filtered = matched.filter((m) => m.startPrice < threshold);
    const trades = filtered.length;
    const wins = filtered.filter((m) => m.result === "WIN").length;
    const totalPnl = filtered.reduce((acc, m) => acc + m.tokenPnl, 0);
    const winRate = trades ? wins / trades : 0;
    const avgPnl = trades ? totalPnl / trades : 0;
    return {
      threshold,
      trades,
      winRate,
      totalPnl: Number(totalPnl.toFixed(4)),
      avgPnl: Number(avgPnl.toFixed(4)),
    };
  });
}

function buildConservativeStats(
  matched: MatchedTrade[],
): ConservativeStat | null {
  if (!matched.length) return null;
  const conservative = matched.filter((m) => m.yesStart + m.noStart < 0.94);
  if (!conservative.length) return null;
  const wins = conservative.filter((m) => m.result === "WIN").length;
  const totalPnl = conservative.reduce((acc, m) => acc + m.tokenPnl, 0);
  const winRate = wins / conservative.length;
  const avgPnl = totalPnl / conservative.length;
  return {
    trades: conservative.length,
    winRate,
    totalPnl: Number(totalPnl.toFixed(4)),
    avgPnl: Number(avgPnl.toFixed(4)),
    coveragePct: conservative.length / matched.length,
  };
}

function buildFilterCandidates(matched: MatchedTrade[]): FilterCandidate[] {
  const entryThresholds = [0.38, 0.4, 0.45, 0.5, 0.55];
  const ddCapsAbs = [0.01, 0.02, 0.03, 0.05, 0.1, 0.15, 0.2];
  const ddCapsPct = [0.05, 0.1, 0.15, 0.2, 0.3];
  const minTrades = 10;
  const minWinRate = 0.8;
  const candidates: FilterCandidate[] = [];
  const withPct = matched.map((m) => ({
    ...m,
    ddPct: m.worstDrawdown,
  }));

  for (const thr of entryThresholds) {
    const base = withPct.filter((m) => m.startPrice < thr);
    if (!base.length) continue;
    for (const cap of ddCapsAbs) {
      const f = base.filter((m) => m.worstDrawdown <= cap);
      if (f.length < minTrades) continue;
      const winRate = f.filter((m) => m.result === "WIN").length / f.length;
      if (winRate < minWinRate) continue;
      const totalPnl = f.reduce((acc, m) => acc + m.tokenPnl, 0);
      candidates.push({
        entryLt: thr,
        ddCapType: "abs",
        ddCap: cap,
        trades: f.length,
        winRate,
        totalPnl: Number(totalPnl.toFixed(4)),
        avgPnl: Number((totalPnl / f.length).toFixed(4)),
        avgDd: Number(
          (f.reduce((acc, m) => acc + m.worstDrawdown, 0) / f.length).toFixed(
            4,
          ),
        ),
        p95Dd: Number(
          percentile(
            f.map((m) => m.worstDrawdown),
            0.95,
          ).toFixed(4),
        ),
        maxDd: Number(Math.max(...f.map((m) => m.worstDrawdown)).toFixed(4)),
      });
    }
    for (const cap of ddCapsPct) {
      const f = base.filter((m) => m.ddPct <= cap);
      if (f.length < minTrades) continue;
      const winRate = f.filter((m) => m.result === "WIN").length / f.length;
      if (winRate < minWinRate) continue;
      const totalPnl = f.reduce((acc, m) => acc + m.tokenPnl, 0);
      candidates.push({
        entryLt: thr,
        ddCapType: "pct",
        ddCap: cap,
        trades: f.length,
        winRate,
        totalPnl: Number(totalPnl.toFixed(4)),
        avgPnl: Number((totalPnl / f.length).toFixed(4)),
        avgDd: Number(
          (f.reduce((acc, m) => acc + m.worstDrawdown, 0) / f.length).toFixed(
            4,
          ),
        ),
        p95Dd: Number(
          percentile(
            f.map((m) => m.worstDrawdown),
            0.95,
          ).toFixed(4),
        ),
        maxDd: Number(Math.max(...f.map((m) => m.worstDrawdown)).toFixed(4)),
      });
    }
  }
  return candidates
    .sort(
      (a, b) =>
        a.maxDd - b.maxDd || a.p95Dd - b.p95Dd || b.totalPnl - a.totalPnl,
    )
    .slice(0, 15);
}

function buildScalpingAnalysis(
  matched: MatchedTrade[],
  signals: ParsedSignal[],
): ScalpingAnalysis | null {
  if (matched.length < 3) return null;

  const sorted = [...matched].sort((a, b) => a.dtUtc - b.dtUtc);
  const firstTs = sorted[0].dtUtc;
  const lastTs = sorted[sorted.length - 1].dtUtc;
  const spanHours = Math.max(1, (lastTs - firstTs) / 3600);
  const spanDays = Math.max(1, spanHours / 24);

  const tradesPerHourAvg = Number((matched.length / spanHours).toFixed(2));
  const tradesPerDayAvg = Number((matched.length / spanDays).toFixed(2));
  const avgHoldTimeSec = Math.round(
    matched.reduce((acc, m) => acc + m.holdTimeSec, 0) / matched.length,
  );

  let maxWinStreak = 0,
    maxLossStreak = 0,
    curWin = 0,
    curLoss = 0;
  for (const t of sorted) {
    if (t.result === "WIN") {
      curWin++;
      curLoss = 0;
      maxWinStreak = Math.max(maxWinStreak, curWin);
    } else {
      curLoss++;
      curWin = 0;
      maxLossStreak = Math.max(maxLossStreak, curLoss);
    }
  }

  const pnls = sorted.map((t) => t.tokenPnl);
  const meanPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const variance =
    pnls.reduce((acc, p) => acc + (p - meanPnl) ** 2, 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio =
    stdDev > 0
      ? Number(
          (
            (meanPnl / stdDev) *
            Math.sqrt((365 * 24) / Math.max(1, spanHours / matched.length))
          ).toFixed(2),
        )
      : 0;

  const grossProfit = matched
    .filter((m) => m.tokenPnl > 0)
    .reduce((acc, m) => acc + m.tokenPnl, 0);
  const grossLoss = Math.abs(
    matched
      .filter((m) => m.tokenPnl < 0)
      .reduce((acc, m) => acc + m.tokenPnl, 0),
  );
  const profitFactor =
    grossLoss > 0
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
        ? Infinity
        : 0;

  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i].dtUtc - sorted[i - 1].dtUtc;
  }
  const avgTimeBetweenTradesSec =
    sorted.length > 1 ? Math.round(totalGap / (sorted.length - 1)) : 0;

  const winRate =
    matched.filter((m) => m.result === "WIN").length / matched.length;
  let viability: "excellent" | "good" | "moderate" | "poor" = "poor";
  let recommendation = "";

  if (winRate >= 0.65 && profitFactor >= 2 && tradesPerDayAvg >= 10) {
    viability = "excellent";
    recommendation =
      "Your strategy shows excellent scalping potential. High frequency with strong win rate and profit factor. Consider deploying on 15m or 1h markets for maximum opportunity.";
  } else if (winRate >= 0.55 && profitFactor >= 1.5 && tradesPerDayAvg >= 5) {
    viability = "good";
    recommendation =
      "Good scalping potential. Consider filtering by best-performing hours and entry thresholds to improve results. 1h markets offer the best balance of frequency and reliability.";
  } else if (winRate >= 0.5 && profitFactor >= 1.2) {
    viability = "moderate";
    recommendation =
      "Moderate scalping potential. Strategy is profitable but may benefit from longer timeframes (4h or 1d) to reduce trade frequency and improve per-trade quality.";
  } else {
    viability = "poor";
    recommendation =
      "Current strategy shows limited scalping viability. Consider: (1) Using the best-hours filter, (2) Adding entry price thresholds, (3) Using longer timeframes for fewer but higher-quality trades.";
  }

  return {
    tradesPerHourAvg,
    tradesPerDayAvg,
    avgHoldTimeSec,
    maxConsecutiveWins: maxWinStreak,
    maxConsecutiveLosses: maxLossStreak,
    sharpeRatio,
    profitFactor,
    avgTimeBetweenTradesSec,
    scalpingViability: viability,
    recommendation,
  };
}

function buildMarketPerformance(matched: MatchedTrade[]): MarketPerformance[] {
  const bySlug = new Map<string, MatchedTrade[]>();
  for (const t of matched) {
    const list = bySlug.get(t.slug) ?? [];
    list.push(t);
    bySlug.set(t.slug, list);
  }

  const perf: MarketPerformance[] = [];
  for (const [slug, trades] of bySlug) {
    const wins = trades.filter((t) => t.result === "WIN").length;
    const totalPnl = trades.reduce((acc, t) => acc + t.tokenPnl, 0);
    const avgDd =
      trades.reduce((acc, t) => acc + t.worstDrawdown, 0) / trades.length;
    const hour = new Date(trades[0].dtUtc * 1000).getUTCHours();
    perf.push({
      slug,
      timeOfDay: `${String(hour).padStart(2, "0")}:00 UTC`,
      trades: trades.length,
      winRate: wins / trades.length,
      totalPnl: Number(totalPnl.toFixed(4)),
      avgPnl: Number((totalPnl / trades.length).toFixed(4)),
      avgDrawdown: Number(avgDd.toFixed(4)),
    });
  }

  return perf.sort((a, b) => b.totalPnl - a.totalPnl).slice(0, 30);
}

function buildTimeframeAnalysis(matched: MatchedTrade[]): TimeframeAnalysis[] {
  const byTf = new Map<string, MatchedTrade[]>();
  for (const t of matched) {
    const tf = t.marketTimeframe || "unknown";
    const list = byTf.get(tf) ?? [];
    list.push(t);
    byTf.set(tf, list);
  }

  const analysis: TimeframeAnalysis[] = [];
  for (const [timeframe, trades] of byTf) {
    const wins = trades.filter((t) => t.result === "WIN").length;
    const totalPnl = trades.reduce((acc, t) => acc + t.tokenPnl, 0);
    const pnls = trades.map((t) => t.tokenPnl);
    const meanPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance =
      pnls.reduce((acc, p) => acc + (p - meanPnl) ** 2, 0) / pnls.length;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? Number((meanPnl / stdDev).toFixed(2)) : 0;

    analysis.push({
      timeframe,
      trades: trades.length,
      winRate: wins / trades.length,
      totalPnl: Number(totalPnl.toFixed(4)),
      avgPnl: Number((totalPnl / trades.length).toFixed(4)),
      sharpeRatio: sharpe,
    });
  }

  return analysis.sort((a, b) => b.totalPnl - a.totalPnl);
}

/* ════════════════════════════════════════════════
   TP LEVEL ANALYSIS
   ════════════════════════════════════════════════ */

function buildTpAnalysis(
  matched: MatchedTrade[],
  marketRows: MarketRow[],
  stakeUsd: number,
): TpLevelStat[] {
  const slugToRow = new Map<string, MarketRow>();
  for (const r of marketRows) slugToRow.set(r.slug, r);

  const tpLevels = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
  return tpLevels.map((tp) => {
    let hits = 0;
    let wins = 0;
    let totalPnl = 0;
    let count = 0;

    for (const trade of matched) {
      const row = slugToRow.get(trade.slug);
      if (!row) continue;
      count++;

      const entry = trade.startPrice;
      const maxSeen = trade.dir === "UP" ? row.yesMax : row.noMax;
      const reached = maxSeen >= tp || entry >= tp;

      if (reached && entry > 0 && entry < tp) {
        hits++;
        const roi = tp / entry - 1;
        totalPnl += roi;
        wins++; // TP hit is always profitable by definition
      } else {
        totalPnl += trade.tokenPnl;
        if (trade.result === "WIN") wins++;
      }
    }

    const trades = count || 1;
    return {
      tp: Math.round(tp * 100),
      trades: count,
      hits,
      hitRate: count ? hits / count : 0,
      winRate: count ? wins / count : 0,
      totalPnl: Number(totalPnl.toFixed(4)),
      avgPnl: Number((totalPnl / trades).toFixed(4)),
    };
  });
}

/* ════════════════════════════════════════════════
   ET HOURLY ANALYSIS
   ════════════════════════════════════════════════ */

function buildEtHourlyStats(matched: MatchedTrade[]): EtHourlyStat[] {
  const buckets: EtHourlyStat[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    trades: 0,
    wins: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
  }));

  for (const trade of matched) {
    const d = new Date(trade.dtUtc * 1000);
    let etHour = parseInt(
      d.toLocaleString("en-US", {
        timeZone: ET_TIMEZONE,
        hour: "numeric",
        hour12: false,
      }),
      10,
    );
    if (etHour === 24) etHour = 0;
    const bucket = buckets[etHour];
    bucket.trades++;
    bucket.totalPnl += trade.tokenPnl;
    if (trade.result === "WIN") bucket.wins++;
  }

  return buckets.map((b) => ({
    ...b,
    winRate: b.trades ? b.wins / b.trades : 0,
    totalPnl: Number(b.totalPnl.toFixed(4)),
    avgPnl: b.trades ? Number((b.totalPnl / b.trades).toFixed(4)) : 0,
  }));
}

/* ════════════════════════════════════════════════
   WEEKDAY ANALYSIS
   ════════════════════════════════════════════════ */

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildWeekdayStats(matched: MatchedTrade[]): WeekdayStat[] {
  const buckets = WEEKDAY_NAMES.map((day, i) => ({
    day,
    dayIndex: i,
    trades: 0,
    wins: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
  }));

  for (const trade of matched) {
    const d = new Date(trade.dtUtc * 1000);
    const etDay = d.toLocaleString("en-US", {
      timeZone: ET_TIMEZONE,
      weekday: "short",
    });
    const idx = WEEKDAY_NAMES.indexOf(etDay);
    if (idx < 0) continue;
    buckets[idx].trades++;
    buckets[idx].totalPnl += trade.tokenPnl;
    if (trade.result === "WIN") buckets[idx].wins++;
  }

  return buckets.map((b) => ({
    ...b,
    winRate: b.trades ? b.wins / b.trades : 0,
    totalPnl: Number(b.totalPnl.toFixed(4)),
    avgPnl: b.trades ? Number((b.totalPnl / b.trades).toFixed(4)) : 0,
  }));
}

/* ════════════════════════════════════════════════
   FILTER GRID SEARCH
   ════════════════════════════════════════════════ */

function buildFilterGrid(
  matched: MatchedTrade[],
  stakeUsd: number,
): { byPnl: FilterGridResult[]; byWr: FilterGridResult[] } {
  if (matched.length < 5) return { byPnl: [], byWr: [] };

  const dirOpts: Array<"UP" | "DOWN" | "BOTH"> = ["BOTH", "UP", "DOWN"];
  const entryOpts = [1.0, 0.5, 0.47, 0.45, 0.42, 0.4];
  const hourSets: Array<number[] | null> = [
    null,
    [9, 10, 11, 12, 13, 14],
    [8, 9, 10, 11],
    [12, 13, 14, 15, 16],
    [17, 18, 19, 20, 21],
  ];
  const weekdaySets: Array<string[] | null> = [
    null,
    ["Mon", "Tue", "Wed", "Thu", "Fri"],
    ["Mon", "Tue", "Wed"],
    ["Thu", "Fri"],
  ];

  const results: FilterGridResult[] = [];

  for (const dir of dirOpts) {
    for (const maxEntry of entryOpts) {
      for (const hours of hourSets) {
        for (const weekdays of weekdaySets) {
          const filtered = matched.filter((t) => {
            if (dir !== "BOTH" && t.dir !== dir) return false;
            if (t.startPrice >= maxEntry) return false;
            if (hours) {
              const d = new Date(t.dtUtc * 1000);
              let etH = parseInt(
                d.toLocaleString("en-US", {
                  timeZone: ET_TIMEZONE,
                  hour: "numeric",
                  hour12: false,
                }),
                10,
              );
              if (etH === 24) etH = 0;
              if (!hours.includes(etH)) return false;
            }
            if (weekdays) {
              const d = new Date(t.dtUtc * 1000);
              const wd = d.toLocaleString("en-US", {
                timeZone: ET_TIMEZONE,
                weekday: "short",
              });
              if (!weekdays.includes(wd)) return false;
            }
            return true;
          });

          if (filtered.length < 5) continue;

          const wins = filtered.filter((t) => t.result === "WIN").length;
          const totalPnl = filtered.reduce((acc, t) => acc + t.tokenPnl, 0);
          const pnls = filtered.map((t) => t.tokenPnl);
          const mean = totalPnl / filtered.length;
          const variance =
            pnls.reduce((acc, p) => acc + (p - mean) ** 2, 0) / pnls.length;
          const std = Math.sqrt(variance);
          const sharpe = std > 0 ? Number((mean / std).toFixed(2)) : 0;

          const parts: string[] = [];
          if (dir !== "BOTH") parts.push(dir);
          if (maxEntry < 1.0) parts.push(`entry<${maxEntry}`);
          if (hours) parts.push(`${hours[0]}-${hours[hours.length - 1]}h ET`);
          if (weekdays) parts.push(weekdays.join(","));

          results.push({
            label: parts.length ? parts.join(" + ") : "No filters",
            cfg: {
              direction: dir,
              maxEntryPrice: maxEntry,
              hours: hours ?? undefined,
              weekdays: weekdays ?? undefined,
            },
            trades: filtered.length,
            winRate: wins / filtered.length,
            totalPnl: Number(totalPnl.toFixed(4)),
            avgPnl: Number((totalPnl / filtered.length).toFixed(4)),
            sharpe,
          });
        }
      }
    }
  }

  const byPnl = [...results]
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, 15);
  const byWr = [...results]
    .filter((r) => r.trades >= 5)
    .sort((a, b) => b.winRate - a.winRate || b.totalPnl - a.totalPnl)
    .slice(0, 15);

  return { byPnl, byWr };
}

/* ════════════════════════════════════════════════
   ENTRY TIMING ANALYSIS
   ════════════════════════════════════════════════ */

function buildEntryTimingAnalysis(
  matched: MatchedTrade[],
  marketRows: MarketRow[],
): EntryTimingStat[] {
  const slugToRow = new Map<string, MarketRow>();
  for (const r of marketRows) slugToRow.set(r.slug, r);

  const bucketMinutes = [5, 10, 15, 20, 30, 45, 60];
  const bucketData: Record<
    number,
    { trades: number; wins: number; totalPnl: number }
  > = {};
  for (const m of bucketMinutes) {
    bucketData[m] = { trades: 0, wins: 0, totalPnl: 0 };
  }

  for (const trade of matched) {
    const row = slugToRow.get(trade.slug);
    if (!row) continue;
    const minsInto = Math.max(0, (trade.dtUtc - row.start) / 60);
    for (const m of bucketMinutes) {
      if (minsInto <= m) {
        bucketData[m].trades++;
        bucketData[m].totalPnl += trade.tokenPnl;
        if (trade.result === "WIN") bucketData[m].wins++;
        break;
      }
    }
  }

  const cumulative: EntryTimingStat[] = [];
  let cumTrades = 0,
    cumWins = 0,
    cumPnl = 0;
  for (const m of bucketMinutes) {
    const b = bucketData[m];
    cumTrades += b.trades;
    cumWins += b.wins;
    cumPnl += b.totalPnl;
    cumulative.push({
      bucket: `≤ ${m}min`,
      minutesInto: m,
      trades: cumTrades,
      winRate: cumTrades ? cumWins / cumTrades : 0,
      totalPnl: Number(cumPnl.toFixed(4)),
      avgPnl: cumTrades ? Number((cumPnl / cumTrades).toFixed(4)) : 0,
    });
  }

  return cumulative;
}

/* ════════════════════════════════════════════════
   RECOMMENDATIONS ENGINE
   ════════════════════════════════════════════════ */

function buildRecommendations(
  matched: MatchedTrade[],
  timeframeAnalysis: TimeframeAnalysis[],
  tpAnalysis: TpLevelStat[],
  etHourly: EtHourlyStat[],
  weekdayStats: WeekdayStat[],
  filterGrid: { byPnl: FilterGridResult[]; byWr: FilterGridResult[] },
  entryTiming: EntryTimingStat[],
  stakeUsd: number,
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (matched.length < 3) return recs;

  const baseWr =
    matched.filter((t) => t.result === "WIN").length / matched.length;
  const basePnl = matched.reduce((acc, t) => acc + t.tokenPnl, 0);

  // Best timeframe
  if (timeframeAnalysis.length > 1) {
    const best = [...timeframeAnalysis].sort(
      (a, b) => b.totalPnl - a.totalPnl,
    )[0];
    if (best && best.trades >= 3) {
      recs.push({
        category: "Timeframe",
        title: `Best market: ${best.timeframe.toUpperCase()}`,
        description: `Your strategy performs best on ${best.timeframe.toUpperCase()} markets with ${(best.winRate * 100).toFixed(1)}% WR and $${(best.totalPnl * stakeUsd).toFixed(2)} PnL (${best.trades} trades).`,
        impact: "high",
        metric: `${(best.winRate * 100).toFixed(1)}% WR`,
      });
    }
  }

  // Best TP level
  const profitableTp = tpAnalysis.filter(
    (t) => t.totalPnl > basePnl && t.hits > 0,
  );
  if (profitableTp.length > 0) {
    const bestTp = profitableTp.sort((a, b) => b.totalPnl - a.totalPnl)[0];
    recs.push({
      category: "Take Profit",
      title: `TP at ${bestTp.tp}% improves PnL`,
      description: `Taking profit when token reaches ${bestTp.tp}% would yield ${bestTp.totalPnl.toFixed(3)} total PnL vs ${basePnl.toFixed(3)} holding (${bestTp.hitRate > 0 ? (bestTp.hitRate * 100).toFixed(0) : 0}% of trades hit this TP).`,
      impact: bestTp.totalPnl > basePnl * 1.2 ? "high" : "medium",
      metric: `+${((bestTp.totalPnl - basePnl) * stakeUsd).toFixed(2)} PnL`,
    });
  }

  // Best hours
  const activeHours = etHourly.filter((h) => h.trades >= 3);
  const goodHours = activeHours.filter((h) => h.winRate > baseWr + 0.05);
  if (goodHours.length > 0 && goodHours.length < activeHours.length) {
    const hourList = goodHours.map((h) => h.hour).sort((a, b) => a - b);
    const filteredTrades = goodHours.reduce((acc, h) => acc + h.trades, 0);
    const filteredWins = goodHours.reduce((acc, h) => acc + h.wins, 0);
    const filteredWr = filteredTrades ? filteredWins / filteredTrades : 0;
    recs.push({
      category: "Hours",
      title: `Filter to ${hourList[0]}:00-${hourList[hourList.length - 1]}:00 ET`,
      description: `Trading only during hours ${hourList.join(", ")} ET improves WR from ${(baseWr * 100).toFixed(1)}% to ${(filteredWr * 100).toFixed(1)}% (${filteredTrades} trades).`,
      impact: filteredWr - baseWr > 0.1 ? "high" : "medium",
      metric: `${(filteredWr * 100).toFixed(1)}% WR`,
    });
  }

  // Worst hours to avoid
  const badHours = activeHours.filter((h) => h.winRate < 0.45 && h.trades >= 3);
  if (badHours.length > 0) {
    const avoidList = badHours.map((h) => `${h.hour}:00`).join(", ");
    recs.push({
      category: "Hours",
      title: `Avoid trading at ${avoidList} ET`,
      description: `These hours have WR below 45%. Skipping them removes ${badHours.reduce((a, h) => a + h.trades, 0)} losing trades.`,
      impact: "medium",
    });
  }

  // Best weekdays
  const activeWeekdays = weekdayStats.filter((w) => w.trades >= 3);
  const bestDays = activeWeekdays.filter((w) => w.winRate > baseWr + 0.05);
  if (bestDays.length > 0 && bestDays.length < activeWeekdays.length) {
    const dayList = bestDays.map((d) => d.day).join(", ");
    const dWins = bestDays.reduce((a, d) => a + d.wins, 0);
    const dTrades = bestDays.reduce((a, d) => a + d.trades, 0);
    recs.push({
      category: "Weekday",
      title: `Best days: ${dayList}`,
      description: `Trading on ${dayList} gives ${(dTrades ? (dWins / dTrades) * 100 : 0).toFixed(1)}% WR vs ${(baseWr * 100).toFixed(1)}% overall.`,
      impact: "medium",
      metric: `${(dTrades ? (dWins / dTrades) * 100 : 0).toFixed(1)}% WR`,
    });
  }

  // Best filter combo
  if (filterGrid.byPnl.length > 0) {
    const best = filterGrid.byPnl[0];
    if (best.totalPnl > basePnl && best.label !== "No filters") {
      recs.push({
        category: "Filter",
        title: `Best filter: ${best.label}`,
        description: `Applying "${best.label}" yields ${(best.winRate * 100).toFixed(1)}% WR, $${(best.totalPnl * stakeUsd).toFixed(2)} PnL with ${best.trades} trades (Sharpe: ${best.sharpe}).`,
        impact: "high",
        metric: `$${(best.totalPnl * stakeUsd).toFixed(2)}`,
      });
    }
  }

  // High WR filter combo
  if (filterGrid.byWr.length > 0) {
    const best = filterGrid.byWr[0];
    if (best.winRate > baseWr + 0.1 && best.label !== "No filters") {
      recs.push({
        category: "Filter",
        title: `Highest WR filter: ${best.label}`,
        description: `"${best.label}" achieves ${(best.winRate * 100).toFixed(1)}% win rate with ${best.trades} trades.`,
        impact: best.winRate > 0.7 ? "high" : "medium",
        metric: `${(best.winRate * 100).toFixed(1)}% WR`,
      });
    }
  }

  // Entry timing
  const earlyEntry = entryTiming.find((e) => e.minutesInto === 15);
  const lateEntry = entryTiming.find((e) => e.minutesInto === 60);
  if (
    earlyEntry &&
    lateEntry &&
    earlyEntry.trades >= 3 &&
    lateEntry.trades > earlyEntry.trades
  ) {
    if (earlyEntry.winRate > lateEntry.winRate + 0.05) {
      recs.push({
        category: "Timing",
        title: "Earlier entries perform better",
        description: `Entries within 15min of market open have ${(earlyEntry.winRate * 100).toFixed(1)}% WR vs ${(lateEntry.winRate * 100).toFixed(1)}% for entries within 60min.`,
        impact: "medium",
        metric: `${(earlyEntry.winRate * 100).toFixed(1)}% early WR`,
      });
    }
  }

  // Direction analysis
  const upTrades = matched.filter((t) => t.dir === "UP");
  const downTrades = matched.filter((t) => t.dir === "DOWN");
  if (upTrades.length >= 3 && downTrades.length >= 3) {
    const upWr =
      upTrades.filter((t) => t.result === "WIN").length / upTrades.length;
    const downWr =
      downTrades.filter((t) => t.result === "WIN").length / downTrades.length;
    if (Math.abs(upWr - downWr) > 0.1) {
      const better = upWr > downWr ? "UP" : "DOWN";
      const betterWr = Math.max(upWr, downWr);
      const worseWr = Math.min(upWr, downWr);
      recs.push({
        category: "Direction",
        title: `${better} signals are stronger`,
        description: `${better} trades have ${(betterWr * 100).toFixed(1)}% WR vs ${(worseWr * 100).toFixed(1)}% for the other direction. Consider filtering to ${better} only.`,
        impact: betterWr - worseWr > 0.15 ? "high" : "medium",
        metric: `${(betterWr * 100).toFixed(1)}% WR`,
      });
    }
  }

  return recs.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
}

function percentile(values: number[], pct: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * pct) - 1),
  );
  return sorted[idx];
}

function safeSplitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else if (ch === "\t" && !inQuotes) {
      // Also handle TSV
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
