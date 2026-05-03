"use client";
import { useEffect, useState, useCallback } from "react";
import Section from "@/components/ui/section";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Table, TBody, TH, THead, TD, TR } from "@/components/ui/table";
import Skeleton from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import VisualReplay from "@/components/backtest/VisualReplay";
import {
  analyzeBacktest,
  BacktestReport,
  Market,
  MarketType,
  BacktestConfig,
  Recommendation,
} from "@/lib/backtest";

const MARKET_TYPES: MarketType[] = ["15m", "1h", "4h", "1d", "all"];
const TIMEFRAMES = ["15m", "1h", "4h", "1d"] as const;
const CSV_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

function dataFileFor(tf: (typeof TIMEFRAMES)[number], asset: "BTC" | "ETH") {
  const suffix = asset === "ETH" ? "-eth" : "";
  return `/data/last-${tf}-markets${suffix}.json`;
}

type DataStatus = {
  [key: string]: { count: number; dateRange: string } | null;
};

export default function BacktestPage() {
  const [step, setStep] = useState<"setup" | "analysis">("setup");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [csvText, setCsvText] = useState("");
  const [csvName, setCsvName] = useState<string | null>(null);
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [marketType, setMarketType] = useState<MarketType>("all");
  const [dataStatus, setDataStatus] = useState<DataStatus>({});
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const [stakeUsd, setStakeUsd] = useState(10);
  const [csvTimeframe, setCsvTimeframe] = useState("15m");
  const [asset, setAsset] = useState<"BTC" | "ETH">("BTC");
  const [timestampsAreUtc, setTimestampsAreUtc] = useState(false);
  const [processOrdersOnClose, setProcessOrdersOnClose] = useState(true);
  const [allowMultipleEntriesSameMarket, setAllowMultipleEntriesSameMarket] =
    useState(true);
  const [analysisTab, setAnalysisTab] = useState<
    "overview" | "visual" | "deep-dive"
  >("overview");
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Data loading ── */

  const loadMarkets = useCallback(async () => {
    setLoadingData(true);
    const allMarkets: Market[] = [];
    const status: DataStatus = {};
    for (const tf of TIMEFRAMES) {
      try {
        const res = await fetch(dataFileFor(tf, asset), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const mks = (json.markets ?? []).map((m: Market) => ({
            ...m,
            sourceTimeframe: tf,
          }));
          allMarkets.push(...mks);
          if (mks.length > 0) {
            const start = mks[0]?.startTs
              ? new Date(mks[0].startTs * 1000).toISOString().slice(0, 10)
              : "?";
            const end = mks[mks.length - 1]?.endTs
              ? new Date(mks[mks.length - 1].endTs * 1000)
                  .toISOString()
                  .slice(0, 10)
              : "?";
            status[tf] = { count: mks.length, dateRange: `${start} → ${end}` };
          } else {
            status[tf] = null;
          }
        } else {
          status[tf] = null;
        }
      } catch {
        status[tf] = null;
      }
    }
    if (allMarkets.length === 0) {
      try {
        const res = await fetch("/data/markets-sample.json", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          allMarkets.push(...(json.markets ?? []));
        }
      } catch {
        /* ignore */
      }
    }
    setMarkets(allMarkets);
    setDataStatus(status);
    setLoadingData(false);
  }, [asset]);

  const refreshMarketData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/markets/refresh", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (!data.skipped) {
          await loadMarkets();
          toast({ title: "Market data updated", variant: "success" });
        }
      }
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, [loadMarkets, toast]);

  useEffect(() => {
    loadMarkets().then(() => {
      if (asset === "BTC") refreshMarketData();
    });
  }, [loadMarkets, refreshMarketData, asset]);

  const totalMarkets = markets.length;
  const hasData = totalMarkets > 0;

  const tzHint = (() => {
    if (!csvText) return null;
    const sample = csvText.slice(0, 2000).toLowerCase();
    if (/\b(z|utc|gmt)\b/.test(sample) || /[+-]\d{2}:?\d{2}\b/.test(sample))
      return {
        kind: "good",
        text: "CSV appears to include timezone info. Confirm below.",
      } as const;
    return {
      kind: "warn",
      text: "Timestamps look timezone-naive. We'll interpret as UTC.",
    } as const;
  })();

  const canRun = Boolean(csvText && timestampsAreUtc);

  function runBacktest() {
    if (!csvText) return;
    setLoading(true);
    setTimeout(() => {
      const config: BacktestConfig = {
        csvTimeframe,
        asset,
        stakeUsd,
        timestampsAreUtc,
        processOrdersOnClose,
        allowMultipleEntriesSameMarket,
        oppositeSignalMode: "flip-side",
      };
      const r = analyzeBacktest({
        tradesCsv: csvText,
        markets,
        marketType,
        stakeUsd,
        config,
      });
      setReport(r);
      setLoading(false);
      if (r.summary.trades > 0) {
        toast({
          title: "Backtest complete",
          description: `${r.summary.trades} trades matched`,
          variant: "success",
        });
      } else {
        toast({
          title: "No matches",
          description: `${r.signalCount} signals parsed but no market data covers those dates.`,
          variant: "default",
        });
      }
    }, 100);
  }

  const csv = report?.csvAnalysis;
  const hasMarketResults = report && report.summary.trades > 0;

  /* ── Render ── */

  return (
    <Section
      title="Backtest"
      description="Upload a CSV, configure settings, then view analysis."
    >
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {[
            { id: "setup", label: "Setup" },
            { id: "analysis", label: "Analysis" },
          ].map((s, i) => (
            <span key={s.id} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-4 bg-[var(--line)]" />}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium transition ${step === s.id ? "bg-[var(--ink)] text-white" : "text-[var(--muted)]"}`}
              >
                {s.label}
              </span>
            </span>
          ))}
          {csvName && (
            <span className="ml-3 text-[11px] text-[var(--muted)]">
              {csvName}
            </span>
          )}
        </div>
        {step === "analysis" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStep("setup")}
            disabled={loading}
          >
            &larr; Back
          </Button>
        )}
      </div>

      {/* ── SETUP ── */}
      {step === "setup" && (
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Upload &amp; Configure</CardTitle>
            </CardHeader>
            <div className="mt-3 grid gap-4">
              {/* File upload */}
              <div className="rounded-[var(--r)] border border-dashed border-[var(--line)] p-4 text-center">
                <input
                  className="w-full text-[13px] file:mr-3 file:rounded-[var(--r)] file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white file:cursor-pointer"
                  type="file"
                  accept=".csv,.tsv,text/csv"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCsvText(await f.text());
                    setCsvName(f.name);
                    setTimestampsAreUtc(false);
                  }}
                />
              </div>

              {tzHint && (
                <div
                  className={`rounded-[var(--r)] border px-3 py-2 text-[11px] ${tzHint.kind === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
                >
                  {tzHint.text}
                </div>
              )}

              {/* Row: CSV Timeframe + Asset */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    CSV Timeframe
                  </label>
                  <select
                    value={csvTimeframe}
                    onChange={(e) => setCsvTimeframe(e.target.value)}
                    className="w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] px-3 py-1.5 text-[13px]"
                  >
                    {CSV_TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    Asset
                  </label>
                  <div className="flex gap-1 rounded-[var(--r)] bg-[var(--line2)] p-0.5 w-fit">
                    {(["BTC", "ETH"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAsset(a)}
                        className={`rounded-[6px] px-3 py-1 text-[12px] font-medium transition ${asset === a ? "bg-[var(--white)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmations */}
              <div className="rounded-[var(--r)] border border-[var(--line)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
                  CSV Assumptions
                </p>
                <div className="grid gap-1.5 text-[12px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timestampsAreUtc}
                      onChange={(e) => setTimestampsAreUtc(e.target.checked)}
                      className="accent-[var(--ink)]"
                    />
                    <span>
                      Timestamps are <strong>UTC</strong>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processOrdersOnClose}
                      onChange={(e) =>
                        setProcessOrdersOnClose(e.target.checked)
                      }
                      className="accent-[var(--ink)]"
                    />
                    <span>
                      <strong>process_orders_on_close = true</strong> (shift
                      entries to next candle)
                    </span>
                  </label>
                </div>
              </div>

              {/* Multiple entries handling */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowMultipleEntriesSameMarket}
                      onChange={(e) =>
                        setAllowMultipleEntriesSameMarket(e.target.checked)
                      }
                      className="accent-[var(--ink)]"
                    />
                    Allow multiple entries per market
                  </label>
                </div>
                <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[11px] text-[var(--muted)]">
                  Opposite signal behavior is automatic: existing position is treated as closed and direction flips.
                </div>
              </div>

              {/* Row: Polymarket TF + Stake */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    Polymarket Timeframe
                  </label>
                  <div className="flex gap-1 rounded-[var(--r)] bg-[var(--line2)] p-0.5 w-fit">
                    {MARKET_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setMarketType(t)}
                        className={`rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition ${marketType === t ? "bg-[var(--white)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    Stake per trade ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={stakeUsd}
                    onChange={(e) => setStakeUsd(Number(e.target.value) || 10)}
                    className="w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] px-3 py-1.5 text-[13px]"
                  />
                </div>
              </div>

              {/* Collapsible: Data coverage */}
              <details className="rounded-[var(--r)] border border-[var(--line)]">
                <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-[var(--ink)]">
                  Data coverage
                  <span className="ml-2 text-[10px] font-normal text-[var(--muted)]">
                    {loadingData
                      ? "loading..."
                      : hasData
                        ? `${totalMarkets.toLocaleString()} markets`
                        : "no data"}
                  </span>
                </summary>
                <div className="border-t border-[var(--line)] px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[var(--muted)]">
                      BTC auto-refreshes; ETH uses local JSON.
                    </span>
                    <button
                      onClick={() => refreshMarketData()}
                      disabled={refreshing || loadingData || asset !== "BTC"}
                      className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-40"
                    >
                      {refreshing ? "Updating..." : "Refresh BTC"}
                    </button>
                  </div>
                  {!loadingData && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TIMEFRAMES.map((tf) => {
                        const s = dataStatus[tf];
                        return (
                          <div
                            key={tf}
                            className={`rounded-[var(--r)] border px-2.5 py-2 text-[11px] ${s ? "border-emerald-200 bg-emerald-50" : "border-[var(--line)] bg-[var(--paper)]"}`}
                          >
                            <div className="font-medium">
                              {tf.toUpperCase()}
                            </div>
                            {s ? (
                              <>
                                <div className="text-[var(--muted)]">
                                  {s.count} markets
                                </div>
                                <div className="text-[var(--muted)]">
                                  {s.dateRange}
                                </div>
                              </>
                            ) : (
                              <div className="text-[var(--muted)]">No data</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>

              {/* Collapsible: Formats */}
              <details className="text-[13px]">
                <summary className="cursor-pointer text-[var(--ink)]">
                  Supported CSV formats
                </summary>
                <pre className="mt-2 rounded-[var(--r)] border border-[var(--line)] bg-[var(--paper)] p-3 text-[11px] whitespace-pre-wrap text-[var(--muted)]">
                  {`Auto-detects columns and directions.
Direction keywords: long/short, buy/sell, up/down, bullish/bearish

TradingView export:
Trade #,Type,Date and time,Signal,Price USD,...
1,Entry short,2026-01-02 09:15,DOWN,88832,...

Simple signals:
Type,Date and time,Signal
Entry Long,2026-03-01 12:00,UP`}
                </pre>
              </details>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    runBacktest();
                    setStep("analysis");
                  }}
                  disabled={loading || !canRun}
                >
                  {loading ? "Running..." : "Run Backtest"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── ANALYSIS ── */}
      {step === "analysis" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            {loading ? (
              <div className="mt-3 grid gap-2">
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
              </div>
            ) : report ? (
              <div className="mt-3 grid gap-4">
                {/* Tab strip */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1 rounded-[var(--r)] bg-[var(--line2)] p-0.5 w-fit">
                  {(
                    [
                      { id: "overview", label: "Overview" },
                      { id: "visual", label: "Visual" },
                      ...(showAdvanced
                        ? ([{ id: "deep-dive", label: "Deep Dive" }] as const)
                        : []),
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAnalysisTab(t.id)}
                      className={`rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition ${analysisTab === t.id ? "bg-[var(--white)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                  </div>
                  <label className="ml-1 flex items-center gap-2 text-[12px] text-[var(--muted)]">
                    <input
                      type="checkbox"
                      checked={showAdvanced}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setShowAdvanced(v);
                        if (!v && analysisTab === "deep-dive") setAnalysisTab("overview");
                      }}
                    />
                    Show advanced analytics
                  </label>
                </div>

                {analysisTab === "visual" && (
                  <VisualReplay
                    asset={asset}
                    csvTimeframe={csvTimeframe}
                    stakeUsd={stakeUsd}
                    matched={report.matched}
                    markets={markets}
                  />
                )}

                {analysisTab === "overview" && (
                  <>
                    {report.fallbackUsed && (
                      <div className="rounded-[var(--r)] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                        Auto-matched against{" "}
                        {report.usedMarketType.toUpperCase()} (requested
                        timeframe had no coverage).
                      </div>
                    )}
                    <div
                      className={`rounded-[var(--r)] px-3 py-2 text-[12px] ${report.matchRate > 0.5 ? "bg-emerald-50 text-emerald-800" : report.summary.trades > 0 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}
                    >
                      {report.signalCount} signals &rarr;{" "}
                      {report.summary.trades} matched (
                      {(report.matchRate * 100).toFixed(1)}%)
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Metric
                        label="Snapped"
                        value={report.dataQuality.snappedToBoundary.toLocaleString()}
                      />
                      <Metric
                        label="Shifted to next bar"
                        value={report.dataQuality.shiftedToNextBar.toLocaleString()}
                      />
                      <Metric
                        label="Skipped duplicates"
                        value={report.dataQuality.skippedDuplicateSignals.toLocaleString()}
                      />
                    </div>

                    {report.summary.trades > 0 ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <Metric
                            label="Trades"
                            value={String(report.summary.trades)}
                          />
                          <Metric
                            label="Win rate"
                            value={`${(report.summary.winRate * 100).toFixed(1)}%`}
                          />
                          <Metric
                            label="ROI"
                            value={`${(report.summary.totalPnl * 100).toFixed(1)}%`}
                            accent={report.summary.totalPnl >= 0}
                          />
                          <Metric
                            label="Max drawdown"
                            value={`${(report.summary.maxDrawdown * 100).toFixed(1)}%`}
                          />
                          <Metric
                            label={`PnL ($${stakeUsd})`}
                            value={`$${report.summary.totalPnlUsd.toFixed(2)}`}
                            accent={report.summary.totalPnlUsd >= 0}
                          />
                          <Metric
                            label={`PnL ($${stakeUsd * 100})`}
                            value={`$${report.summary.totalPnlUsd100.toFixed(2)}`}
                            accent={report.summary.totalPnlUsd100 >= 0}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                            Equity Curve
                          </label>
                          <EquityChart data={report.equity} />
                        </div>
                      </>
                    ) : (
                      <p className="text-[13px] text-[var(--muted)]">
                        No Polymarket markets found covering your signal dates.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-[var(--muted)]">
                No report yet. Go back and run the backtest.
              </p>
            )}
          </Card>

          {/* Recommendations */}
          {analysisTab === "overview" &&
            showAdvanced &&
            hasMarketResults &&
            report!.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <div className="mt-3 grid gap-2">
                  {report!.recommendations.map((rec, i) => (
                    <RecommendationCard key={i} rec={rec} />
                  ))}
                </div>
              </Card>
            )}

          {/* CSV summary */}
          {analysisTab === "overview" && csv && csv.trades > 0 && (
            <details>
              <summary className="cursor-pointer text-[13px] font-medium text-[var(--ink)]">
                CSV Summary ({csv.trades} trades)
              </summary>
              <div className="mt-2 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--white)] p-4">
                <div className="text-[11px] text-[var(--muted)] mb-2">
                  {csv.dateRange} &middot; Avg hold:{" "}
                  {formatDuration(csv.avgHoldTimeSec)}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric
                    label="Win rate"
                    value={`${(csv.winRate * 100).toFixed(1)}%`}
                  />
                  <Metric
                    label="Total PnL"
                    value={`$${csv.totalPnl.toFixed(2)}`}
                    accent={csv.totalPnl >= 0}
                  />
                  <Metric
                    label="Profit factor"
                    value={
                      csv.profitFactor === Infinity
                        ? "∞"
                        : String(csv.profitFactor)
                    }
                  />
                  <Metric label="Sharpe" value={String(csv.sharpeRatio)} />
                </div>
              </div>
            </details>
          )}

          {/* Deep Dive */}
          {showAdvanced && analysisTab === "deep-dive" && hasMarketResults && (
            <DeepDive report={report!} stakeUsd={stakeUsd} />
          )}
        </div>
      )}
    </Section>
  );
}

/* ── Deep Dive (extracted for clarity) ── */

function DeepDive({
  report,
  stakeUsd,
}: {
  report: BacktestReport;
  stakeUsd: number;
}) {
  return (
    <div className="grid gap-4">
      {report.timeframeAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeframe Comparison</CardTitle>
          </CardHeader>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>TF</TH>
                  <TH>Trades</TH>
                  <TH>Win Rate</TH>
                  <TH>PnL</TH>
                  <TH>Sharpe</TH>
                </TR>
              </THead>
              <TBody>
                {report.timeframeAnalysis.map((t) => (
                  <TR key={t.timeframe}>
                    <TD className="font-medium">{t.timeframe.toUpperCase()}</TD>
                    <TD>{t.trades}</TD>
                    <TD>{(t.winRate * 100).toFixed(1)}%</TD>
                    <TD
                      className={
                        t.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                      }
                    >
                      {t.totalPnl.toFixed(3)}
                    </TD>
                    <TD>{t.sharpeRatio}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {report.tpAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Take Profit Optimization</CardTitle>
          </CardHeader>
          <p className="text-[11px] text-[var(--muted)] mt-1">
            PnL at different early-exit levels vs holding to resolution.
          </p>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>TP</TH>
                  <TH>Trades</TH>
                  <TH>Hits</TH>
                  <TH>Hit Rate</TH>
                  <TH>PnL</TH>
                </TR>
              </THead>
              <TBody>
                {report.tpAnalysis.map((t) => (
                  <TR key={t.tp}>
                    <TD className="font-medium">{t.tp}%</TD>
                    <TD>{t.trades}</TD>
                    <TD>{t.hits}</TD>
                    <TD>{(t.hitRate * 100).toFixed(1)}%</TD>
                    <TD
                      className={
                        t.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                      }
                    >
                      {t.totalPnl.toFixed(3)}
                    </TD>
                  </TR>
                ))}
                <TR>
                  <TD className="font-medium">Hold</TD>
                  <TD>{report.summary.trades}</TD>
                  <TD>&mdash;</TD>
                  <TD>&mdash;</TD>
                  <TD
                    className={
                      report.summary.totalPnl >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }
                  >
                    {report.summary.totalPnl.toFixed(3)}
                  </TD>
                </TR>
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {report.etHourly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hour Analysis (ET)</CardTitle>
          </CardHeader>
          <div className="mt-3">
            <HourBarChart data={report.etHourly} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Hour</TH>
                  <TH>Trades</TH>
                  <TH>Wins</TH>
                  <TH>Win Rate</TH>
                  <TH>PnL</TH>
                </TR>
              </THead>
              <TBody>
                {report.etHourly
                  .filter((h) => h.trades > 0)
                  .map((h) => (
                    <TR key={h.hour}>
                      <TD className="font-medium">
                        {String(h.hour).padStart(2, "0")}:00
                      </TD>
                      <TD>{h.trades}</TD>
                      <TD>{h.wins}</TD>
                      <TD
                        className={
                          h.winRate >= 0.55
                            ? "text-emerald-600"
                            : h.winRate < 0.45
                              ? "text-rose-600"
                              : ""
                        }
                      >
                        {(h.winRate * 100).toFixed(1)}%
                      </TD>
                      <TD
                        className={
                          h.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                        }
                      >
                        {h.totalPnl.toFixed(3)}
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {report.weekdayStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekday Analysis</CardTitle>
          </CardHeader>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {report.weekdayStats.map((w) => (
              <div
                key={w.day}
                className={`rounded-[var(--r)] border p-2 text-center text-[11px] ${w.trades === 0 ? "opacity-30" : ""} ${w.winRate >= 0.55 ? "border-emerald-200 bg-emerald-50" : w.winRate < 0.45 && w.trades > 0 ? "border-rose-200 bg-rose-50" : "border-[var(--line)]"}`}
              >
                <div className="font-medium">{w.day}</div>
                <div className="text-[var(--muted)]">{w.trades}</div>
                {w.trades > 0 && (
                  <div
                    className={
                      w.winRate >= 0.55
                        ? "text-emerald-600"
                        : w.winRate < 0.45
                          ? "text-rose-600"
                          : ""
                    }
                  >
                    {(w.winRate * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {(report.filterGrid.byPnl.length > 0 ||
        report.filterGrid.byWr.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Grid Search</CardTitle>
          </CardHeader>
          <p className="text-[11px] text-[var(--muted)] mt-1">
            Best filter combinations by PnL and win rate.
          </p>
          {report.filterGrid.byPnl.length > 0 && (
            <details className="mt-3" open>
              <summary className="cursor-pointer text-[12px] font-medium">
                Top by PnL
              </summary>
              <div className="mt-2 overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Filter</TH>
                      <TH>Trades</TH>
                      <TH>Win Rate</TH>
                      <TH>PnL</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {report.filterGrid.byPnl.slice(0, 8).map((g, i) => (
                      <TR key={i}>
                        <TD className="text-[11px] max-w-[200px]">{g.label}</TD>
                        <TD>{g.trades}</TD>
                        <TD>{(g.winRate * 100).toFixed(1)}%</TD>
                        <TD
                          className={
                            g.totalPnl >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }
                        >
                          {g.totalPnl.toFixed(3)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </details>
          )}
        </Card>
      )}

      {report.entryTiming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entry Timing</CardTitle>
          </CardHeader>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Window</TH>
                  <TH>Trades</TH>
                  <TH>Win Rate</TH>
                  <TH>PnL</TH>
                </TR>
              </THead>
              <TBody>
                {report.entryTiming
                  .filter((e) => e.trades > 0)
                  .map((e) => (
                    <TR key={e.bucket}>
                      <TD className="font-medium">{e.bucket}</TD>
                      <TD>{e.trades}</TD>
                      <TD>{(e.winRate * 100).toFixed(1)}%</TD>
                      <TD
                        className={
                          e.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                        }
                      >
                        {e.totalPnl.toFixed(3)}
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {report.scalping && (
        <Card>
          <CardHeader>
            <CardTitle>Scalping Analysis</CardTitle>
          </CardHeader>
          <div className="mt-3 grid gap-3">
            <div
              className={`rounded-[var(--r)] border px-3 py-2 text-[13px] ${
                report.scalping.scalpingViability === "excellent"
                  ? "border-emerald-200 bg-emerald-50"
                  : report.scalping.scalpingViability === "good"
                    ? "border-blue-200 bg-blue-50"
                    : report.scalping.scalpingViability === "moderate"
                      ? "border-amber-200 bg-amber-50"
                      : "border-rose-200 bg-rose-50"
              }`}
            >
              <span className="font-medium capitalize">
                {report.scalping.scalpingViability}
              </span>
              <span className="ml-2 text-[12px] text-[var(--muted)]">
                {report.scalping.recommendation}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric
                label="Trades/Hour"
                value={String(report.scalping.tradesPerHourAvg)}
              />
              <Metric
                label="Trades/Day"
                value={String(report.scalping.tradesPerDayAvg)}
              />
              <Metric
                label="Win Streak"
                value={String(report.scalping.maxConsecutiveWins)}
              />
              <Metric
                label="Loss Streak"
                value={String(report.scalping.maxConsecutiveLosses)}
              />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top Trades</CardTitle>
        </CardHeader>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
              Winners
            </p>
            <Table>
              <THead>
                <TR>
                  <TH>Market</TH>
                  <TH>Side</TH>
                  <TH>Entry</TH>
                  <TH>PnL</TH>
                </TR>
              </THead>
              <TBody>
                {report.topWinners.map((t, idx) => (
                  <TR key={`${t.slug}-${t.dtUtc}-${t.dir}-${idx}-w`}>
                    <TD className="max-w-[100px] truncate text-[11px] font-mono">
                      {t.slug}
                    </TD>
                    <TD>{t.dir}</TD>
                    <TD>{(t.startPrice * 100).toFixed(1)}%</TD>
                    <TD className="text-emerald-600">
                      {t.tokenPnl.toFixed(3)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
              Losers
            </p>
            <Table>
              <THead>
                <TR>
                  <TH>Market</TH>
                  <TH>Side</TH>
                  <TH>Entry</TH>
                  <TH>PnL</TH>
                </TR>
              </THead>
              <TBody>
                {report.topLosers.map((t, idx) => (
                  <TR key={`${t.slug}-${t.dtUtc}-${t.dir}-${idx}-l`}>
                    <TD className="max-w-[100px] truncate text-[11px] font-mono">
                      {t.slug}
                    </TD>
                    <TD>{t.dir}</TD>
                    <TD>{(t.startPrice * 100).toFixed(1)}%</TD>
                    <TD className="text-rose-600">{t.tokenPnl.toFixed(3)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Helper Components ── */

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${accent !== undefined ? (accent ? "text-emerald-600" : "text-rose-600") : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const border =
    rec.impact === "high"
      ? "border-emerald-200 bg-emerald-50"
      : rec.impact === "medium"
        ? "border-blue-200 bg-blue-50"
        : "border-[var(--line)]";
  return (
    <div className={`rounded-[var(--r)] border p-3 ${border}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {rec.category}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rec.impact === "high" ? "bg-emerald-100 text-emerald-700" : rec.impact === "medium" ? "bg-blue-100 text-blue-700" : "bg-[var(--line2)] text-[var(--muted)]"}`}
        >
          {rec.impact}
        </span>
        {rec.metric && (
          <span className="ml-auto text-[11px] font-medium">{rec.metric}</span>
        )}
      </div>
      <div className="text-[13px] font-medium">{rec.title}</div>
      <div className="text-[12px] text-[var(--muted)]">{rec.description}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function EquityChart({ data }: { data: number[] }) {
  const w = 440,
    h = 100;
  const minY = Math.min(...data, 0);
  const maxY = Math.max(...data, 0);
  const points = data
    .map((y, idx) => {
      const x = (idx / (data.length - 1 || 1)) * (w - 4) + 2;
      const ny = h - ((y - minY) / (maxY - minY || 1)) * (h - 4) - 2;
      return `${x},${ny}`;
    })
    .join(" ");
  const zeroY = h - ((0 - minY) / (maxY - minY || 1)) * (h - 4) - 2;
  return (
    <svg
      width={w}
      height={h}
      className="w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <line
        x1={2}
        y1={zeroY}
        x2={w - 2}
        y2={zeroY}
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.15"
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points}
        className="text-[var(--ink)]"
      />
    </svg>
  );
}

function HourBarChart({
  data,
}: {
  data: { hour: number; trades: number; winRate: number; totalPnl: number }[];
}) {
  const maxTrades = Math.max(...data.map((d) => d.trades), 1);
  return (
    <div className="grid grid-cols-12 gap-0.5">
      {data
        .filter((_, i) => i < 24)
        .map((d) => (
          <div key={d.hour} className="flex flex-col items-center gap-0.5">
            <div
              className="w-full"
              style={{
                height: `${Math.max(3, (d.trades / maxTrades) * 40)}px`,
              }}
            >
              <div
                className={`h-full w-full rounded-[2px] ${d.trades === 0 ? "bg-[var(--line)]" : d.winRate >= 0.55 ? "bg-emerald-500" : d.winRate < 0.45 ? "bg-rose-400" : "bg-[var(--muted2)]"}`}
                style={{ opacity: d.trades ? 0.7 : 0.15 }}
                title={`${d.hour}:00 ET · ${d.trades} trades · ${(d.winRate * 100).toFixed(0)}% WR`}
              />
            </div>
            <div className="text-[8px] text-[var(--muted)]">{d.hour}</div>
          </div>
        ))}
    </div>
  );
}
