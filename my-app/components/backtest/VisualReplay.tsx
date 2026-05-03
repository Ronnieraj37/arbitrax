"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  SeriesMarker,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import {
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  createTextWatermark,
} from "lightweight-charts";
import Button from "@/components/ui/button";
import { MatchedTrade, Market } from "@/lib/backtest";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function clampTs(ts: number) {
  return Math.max(0, Math.floor(ts));
}

function fmtTs(ts: number) {
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return String(ts);
  }
}

type ProbPoint = { time: UTCTimestamp; value: number };

function nearestValue(points: ProbPoint[], ts: number): number | null {
  if (!points.length) return null;
  let lo = 0;
  let hi = points.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = points[mid].time as number;
    if (t === ts) return points[mid].value;
    if (t < ts) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // pick closer of best and best+1
  const a = points[best];
  const b = points[Math.min(best + 1, points.length - 1)];
  if (!a) return null;
  if (!b) return a.value;
  return Math.abs((a.time as number) - ts) <= Math.abs((b.time as number) - ts)
    ? a.value
    : b.value;
}

function fmtUsd(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

export default function VisualReplay({
  asset,
  csvTimeframe,
  stakeUsd,
  matched,
  markets,
}: {
  asset: "BTC" | "ETH";
  csvTimeframe: string;
  stakeUsd: number;
  matched: MatchedTrade[];
  markets: Market[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const yesSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [loading, setLoading] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [viewTimeframe, setViewTimeframe] = useState<
    "all" | "15m" | "1h" | "4h" | "1d"
  >("all");
  const [chartTimeframe, setChartTimeframe] = useState<string>(csvTimeframe);
  const [hover, setHover] = useState<{
    time: number;
    o: number;
    h: number;
    l: number;
    c: number;
    chg: number;
    chgPct: number;
    v: number;
    yes: number | null;
  } | null>(null);

  const filteredMarkets = useMemo(() => {
    if (viewTimeframe === "all") return markets;
    return markets.filter((m) => (m.sourceTimeframe ?? "") === viewTimeframe);
  }, [markets, viewTimeframe]);

  const filteredTrades = useMemo(() => {
    if (viewTimeframe === "all") return matched;
    return matched.filter((m) => m.marketTimeframe === viewTimeframe);
  }, [matched, viewTimeframe]);

  const bounds = useMemo(() => {
    // Prefer market history bounds so users can scroll further back than just the trade window.
    const pts: number[] = [];
    for (const m of filteredMarkets) {
      const hist = m.yesTokenHistory?.history ?? [];
      for (const h of hist) {
        if (typeof h.t === "number") pts.push(h.t);
      }
    }
    pts.sort((a, b) => a - b);
    if (pts.length > 0) {
      return { start: clampTs(pts[0]), end: clampTs(pts[pts.length - 1]) };
    }
    const ts = filteredTrades
      .map((m) => m.dtUtc)
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (ts.length === 0) return null;
    const start = ts[0] - 60 * 60 * 6; // pad 6h
    const end = ts[ts.length - 1] + 60 * 60 * 6;
    return { start: clampTs(start), end: clampTs(end) };
  }, [filteredTrades, filteredMarkets]);

  const yesSeriesData = useMemo(() => {
    // Build a sparse YES probability line across all loaded markets.
    const points: Array<{ time: UTCTimestamp; value: number }> = [];
    for (const m of filteredMarkets) {
      const hist = m.yesTokenHistory?.history ?? [];
      for (const h of hist) {
        if (typeof h.t === "number" && typeof h.p === "number") {
          points.push({ time: h.t as UTCTimestamp, value: h.p });
        }
      }
    }
    points.sort((a, b) => a.time - b.time);
    // thin out extremely dense data
    const out: typeof points = [];
    let lastT = 0;
    for (const p of points) {
      if (out.length === 0 || p.time - lastT >= 30) {
        out.push(p);
        lastT = p.time;
      }
    }
    return out;
  }, [filteredMarkets]);

  const probDelta = useMemo(() => {
    const horizons = [
      { label: "15m", sec: 15 * 60 },
      { label: "1h", sec: 60 * 60 },
      { label: "4h", sec: 4 * 60 * 60 },
      { label: "1d", sec: 24 * 60 * 60 },
    ];
    const points = yesSeriesData;
    if (!filteredTrades.length || !points.length) {
      return horizons.map((h) => ({
        ...h,
        n: 0,
        avg: 0,
        winAvg: 0,
        lossAvg: 0,
      }));
    }

    return horizons.map((h) => {
      let n = 0;
      let sum = 0;
      let wn = 0;
      let wsum = 0;
      let ln = 0;
      let lsum = 0;

      for (const t of filteredTrades) {
        const entryYes = nearestValue(points, t.dtUtc);
        const laterYes = nearestValue(points, t.dtUtc + h.sec);
        if (entryYes == null || laterYes == null) continue;

        const entryToken = t.dir === "UP" ? entryYes : 1 - entryYes;
        const laterToken = t.dir === "UP" ? laterYes : 1 - laterYes;
        const delta = laterToken - entryToken;

        n++;
        sum += delta;
        if (t.result === "WIN") {
          wn++;
          wsum += delta;
        } else {
          ln++;
          lsum += delta;
        }
      }

      return {
        ...h,
        n,
        avg: n ? sum / n : 0,
        winAvg: wn ? wsum / wn : 0,
        lossAvg: ln ? lsum / ln : 0,
      };
    });
  }, [filteredTrades, yesSeriesData]);

  const displayTrades = useMemo(
    () => [...(filteredTrades ?? [])].sort((a, b) => a.dtUtc - b.dtUtc),
    [filteredTrades],
  );

  const loadCandles = async () => {
    if (!bounds) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ohlc?asset=${asset}&timeframe=${encodeURIComponent(chartTimeframe)}&start=${bounds.start}&end=${bounds.end}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      setCandles(json.candles ?? []);
    } catch {
      setCandles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, chartTimeframe, bounds?.start, bounds?.end]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 780,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(30,41,59,0.85)",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.25)" },
        horzLines: { color: "rgba(148,163,184,0.25)" },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: {
        borderColor: "rgba(148,163,184,0.35)",
        scaleMargins: { top: 0.1, bottom: 0.24 },
      },
      timeScale: {
        borderColor: "rgba(148,163,184,0.35)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ea5e9",
      downColor: "#f97316",
      wickUpColor: "#0ea5e9",
      wickDownColor: "#f97316",
      borderVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    candleSeriesRef.current = candleSeries;
    markersApiRef.current = createSeriesMarkers(candleSeries);

    const yesLine = chart.addSeries(LineSeries, {
      color: "rgba(15,118,110,0.8)",
      lineWidth: 2,
      priceScaleId: "left",
      priceFormat: { type: "percent", precision: 2 },
    });
    yesSeriesRef.current = yesLine;
    yesLine.priceScale().applyOptions({
      scaleMargins: { top: 0.15, bottom: 0.15 },
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "rgba(100,116,139,0.35)",
    });
    volSeriesRef.current = volSeries;
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0.0 },
    });

    // Watermark
    try {
      const firstPane = chart.panes()[0];
      createTextWatermark(firstPane, {
        horzAlign: "center",
        vertAlign: "center",
        lines: [
          {
            text: `${asset} · ${csvTimeframe.toUpperCase()}`,
            color: "rgba(148,163,184,0.22)",
            fontSize: 56,
            fontStyle: "bold",
          },
          {
            text: "Candles (Binance) + Polymarket probability",
            color: "rgba(148,163,184,0.18)",
            fontSize: 16,
            fontStyle: "normal",
          },
        ],
      });
    } catch {
      // ignore watermark errors
    }

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        setHover(null);
        return;
      }
      const t = param.time as number;
      const idx = candles.findIndex((c) => c.time === t);
      const c = idx >= 0 ? candles[idx] : null;
      if (!c) return;
      const prev = idx > 0 ? candles[idx - 1] : null;
      const chg = prev ? c.close - prev.close : 0;
      const chgPct = prev && prev.close ? chg / prev.close : 0;
      const yes = nearestValue(yesSeriesData, t);
      setHover({
        time: t,
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        chg,
        chgPct,
        v: c.volume ?? 0,
        yes,
      });
    });

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(() => {});
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      yesSeriesRef.current = null;
      volSeriesRef.current = null;
      markersApiRef.current = null;
    };
  }, [asset, chartTimeframe, candles, yesSeriesData]);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    candleSeriesRef.current.setData(
      (candles ?? []).map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    if (volSeriesRef.current) {
      volSeriesRef.current.setData(
        (candles ?? []).map((c) => ({
          time: c.time as Time,
          value: c.volume ?? 0,
          color:
            c.close >= c.open
              ? "rgba(14,165,233,0.35)"
              : "rgba(249,115,22,0.35)",
        })),
      );
    }
    chartRef.current.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!yesSeriesRef.current) return;
    yesSeriesRef.current.setData(yesSeriesData);
  }, [yesSeriesData]);

  useEffect(() => {
    if (!markersApiRef.current) return;
    const markers: SeriesMarker<Time>[] = displayTrades.map((t, idx) => {
      const isUp = t.dir === "UP";
      const isSelected = selectedIdx === idx;
      const position: "aboveBar" | "belowBar" = isUp ? "belowBar" : "aboveBar";
      const shape: "arrowUp" | "arrowDown" | "circle" = isSelected
        ? "circle"
        : isUp
          ? "arrowUp"
          : "arrowDown";
      // Minimal text — only show on selected trade to reduce visual clutter
      const text = isSelected ? (isUp ? "UP" : "DN") : "";
      return {
        time: t.dtUtc as UTCTimestamp,
        position,
        color: isSelected
          ? "#111827"
          : t.result === "WIN"
            ? "#16a34a"
            : "#dc2626",
        shape,
        text,
      };
    });
    markersApiRef.current.setMarkers(markers);
  }, [displayTrades, selectedIdx, stakeUsd]);

  const jumpToTrade = (idx: number) => {
    setSelectedIdx(idx);
    const t = displayTrades[idx];
    if (!t || !chartRef.current) return;
    const from = clampTs(t.dtUtc - 60 * 60 * 2);
    const to = clampTs(t.dtUtc + 60 * 60 * 6);
    try {
      chartRef.current.timeScale().setVisibleRange({
        from: from as UTCTimestamp,
        to: to as UTCTimestamp,
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--white)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[var(--ink)]">
            Visual Replay
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--muted)]">
            Candles: {asset} ({chartTimeframe.toUpperCase()}) · Overlay:
            Polymarket token probability · Markers: matched trades
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewTimeframe}
            onChange={(e) =>
              setViewTimeframe(
                e.target.value as "all" | "15m" | "1h" | "4h" | "1d",
              )
            }
            className="rounded-md border border-[var(--line)] bg-[var(--white)] px-2 py-1 text-[12px]"
            title="Filter by market timeframe"
          >
            <option value="all">All markets</option>
            <option value="15m">15m markets</option>
            <option value="1h">1h markets</option>
            <option value="4h">4h markets</option>
            <option value="1d">1d markets</option>
          </select>
          <select
            value={chartTimeframe}
            onChange={(e) => setChartTimeframe(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--white)] px-2 py-1 text-[12px]"
            title="Candle timeframe"
          >
            <option value="15m">15m candles</option>
            <option value="1h">1h candles</option>
            <option value="4h">4h candles</option>
            <option value="1d">1d candles</option>
          </select>
          <Button
            variant="secondary"
            onClick={loadCandles}
            disabled={loading || !bounds}
          >
            {loading ? "Loading…" : "Reload candles"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="relative">
            <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-[var(--white)]/85 px-2 py-1 text-[11px] text-[var(--ink)] backdrop-blur">
              <div className="font-medium">
                {asset} · {chartTimeframe.toUpperCase()} · Binance
              </div>
              {hover ? (
                <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {fmtTs(hover.time)} UTC · O {fmtUsd(hover.o)} H{" "}
                  {fmtUsd(hover.h)} L {fmtUsd(hover.l)} C {fmtUsd(hover.c)}{" "}
                  <span
                    className={
                      hover.chg >= 0
                        ? "text-[var(--sage)]"
                        : "text-[var(--rose)]"
                    }
                  >
                    {hover.chg >= 0 ? "+" : ""}
                    {fmtUsd(hover.chg)} ({(hover.chgPct * 100).toFixed(2)}%)
                  </span>
                  {typeof hover.yes === "number" && (
                    <> · YES {(hover.yes * 100).toFixed(2)}%</>
                  )}{" "}
                  · Vol {hover.v.toLocaleString()}
                </div>
              ) : (
                <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                  Hover the chart to see OHLC, change, volume, and YES %.
                </div>
              )}
            </div>
            <div ref={containerRef} className="w-full" />
          </div>
          {!bounds && (
            <div className="mt-3 text-xs text-[var(--muted)]">
              Run a backtest first to generate matched trades, then this panel
              will render.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--white)] p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-[var(--ink)]">Trades</div>
            <div className="text-[11px] text-[var(--muted)]">
              {displayTrades.length} matched
            </div>
          </div>
          <div className="mt-2 max-h-[520px] overflow-auto">
            <div className="grid gap-1">
              {displayTrades.map((t, idx) => {
                const isUp = t.dir === "UP";
                const pnl = t.tokenPnl * stakeUsd;
                return (
                  <button
                    key={`${t.slug}-${t.dtUtc}-${idx}`}
                    type="button"
                    onClick={() => jumpToTrade(idx)}
                    className={`w-full rounded-lg border px-2 py-2 text-left text-[11px] leading-snug ${
                      selectedIdx === idx
                        ? "border-[var(--ink)]/40 bg-[var(--line)]/10"
                        : "border-[var(--line)] hover:bg-[var(--line)]/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-[var(--ink)]">
                        {isUp ? "UP" : "DOWN"} · {t.result}
                      </div>
                      <div
                        className={
                          pnl >= 0 ? "text-[var(--sage)]" : "text-[var(--rose)]"
                        }
                      >
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-0.5 text-[var(--muted)]">
                      {fmtTs(t.dtUtc)} UTC
                    </div>
                    <div className="mt-0.5 break-words text-[var(--muted)]">
                      {t.slug}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)]">
            Click a trade to zoom the chart around the entry.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--white)] p-3">
        <div className="text-xs font-medium text-[var(--ink)]">
          Probability delta after entry
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">
          Average change in the token you bought (YES for UP, NO for DOWN) after
          entry.
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {probDelta.map((h) => (
            <div
              key={h.label}
              className="rounded-lg border border-[var(--line)] bg-[var(--white)] px-3 py-2 text-[11px]"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-[var(--ink)]">{h.label}</div>
                <div className="text-[var(--muted)]">{h.n} trades</div>
              </div>
              <div
                className={`mt-1 text-sm font-medium ${h.avg >= 0 ? "text-[var(--sage)]" : "text-[var(--rose)]"}`}
              >
                {h.avg >= 0 ? "+" : ""}
                {(h.avg * 100).toFixed(2)}%
              </div>
              <div className="mt-1 text-[10px] text-[var(--muted)]">
                Wins: {(h.winAvg * 100).toFixed(2)}% · Losses:{" "}
                {(h.lossAvg * 100).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
