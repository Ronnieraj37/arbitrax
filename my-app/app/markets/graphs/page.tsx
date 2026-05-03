"use client";

import { useEffect, useMemo, useState } from "react";
import Section from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title,
  Filler,
);

type MarketListItem = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  labelLocal: string | null;
  resolved: boolean;
};

type MarketListResponse = {
  generatedAt: string;
  timeframe: string;
  range: { markets: number; startTs: number | null; endTs: number | null };
  total: number;
  limit: number;
  offset: number;
  markets: MarketListItem[];
};

type PricePoint = { t: number; p: number };
type MarketBundle = {
  slug: string;
  title: string | null;
  startTs: number;
  endTs: number;
  yesTokenHistory: { history: PricePoint[] } | null;
};

export default function MarketGraphsPage() {
  const [asset, setAsset] = useState<"BTC" | "ETH">("BTC");
  const [timeframe, setTimeframe] = useState<"15m" | "1h" | "4h" | "1d">("15m");
  const [status, setStatus] = useState<"active" | "resolved" | "all">("active");
  const [pageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [list, setList] = useState<MarketListResponse | null>(null);
  const [selected, setSelected] = useState<MarketListItem | null>(null);
  const [market, setMarket] = useState<MarketBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadList(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        asset,
        timeframe,
        status,
        limit: String(pageSize),
        offset: String(nextPage * pageSize),
      });
      const res = await fetch(`/api/market-data?${qs}`, { cache: "no-store" });
      const json = (await res.json()) as MarketListResponse;
      if (!res.ok)
        throw new Error((json as any)?.message ?? "Failed to load markets");
      setList(json);
      setSelected(json.markets[0] ?? null);
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList(0);
  }, []);

  useEffect(() => {
    async function loadMarket() {
      if (!selected?.slug) return;
      try {
        const res = await fetch(
          `/api/market-data/market?asset=${encodeURIComponent(asset)}&timeframe=${encodeURIComponent(timeframe)}&slug=${encodeURIComponent(selected.slug)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        setMarket(json.market as MarketBundle);
      } catch {
        /* ignore */
      }
    }
    loadMarket();
  }, [selected, timeframe, asset]);

  const chartData = useMemo(() => {
    const hist = market?.yesTokenHistory?.history ?? [];
    const points = hist
      .filter((pt) => (market?.startTs ? pt.t >= market.startTs : true))
      .filter((pt) => (market?.endTs ? pt.t <= market.endTs : true))
      .map((pt) => ({ x: pt.t * 1000, y: Math.round(pt.p * 10000) / 100 }));
    return {
      datasets: [
        {
          label: "YES (%)",
          data: points,
          borderColor: "var(--ink)",
          backgroundColor: "rgba(14,15,17,0.04)",
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    };
  }, [market]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `YES: ${ctx.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          type: "time" as const,
          time: {
            unit: timeframe === "15m" ? ("hour" as const) : ("day" as const),
          },
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: { font: { size: 10 } },
        },
        y: {
          min: 0,
          max: 100,
          ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
      },
    }),
    [timeframe],
  );

  return (
    <Section
      title="Market Graphs"
      description="Browse markets and view probability charts."
    >
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["BTC", "ETH"] as const).map((a) => (
          <button
            key={a}
            onClick={() => {
              setAsset(a);
              setPage(0);
            }}
            className={`rounded-[var(--r)] px-2.5 py-1 text-[12px] font-medium transition ${asset === a ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line2)]"}`}
          >
            {a}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--line)]" />
        {(["15m", "1h", "4h", "1d"] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => {
              setTimeframe(tf);
              setPage(0);
            }}
            className={`rounded-[var(--r)] px-2.5 py-1 text-[12px] font-medium transition ${timeframe === tf ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line2)]"}`}
          >
            {tf.toUpperCase()}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--line)]" />
        {(["active", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
            className={`rounded-[var(--r)] px-2.5 py-1 text-[12px] font-medium capitalize transition ${status === s ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line2)]"}`}
          >
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => loadList(0)}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {loading && <Skeleton className="h-[500px] rounded-[var(--r-lg)]" />}
      {error && (
        <Card className="py-6 text-center text-sm text-[var(--rose)]">
          {error}
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
              <span className="text-[11px] text-[var(--muted)]">
                Page {page + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadList(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadList(page + 1)}
                  disabled={
                    (list?.offset ?? 0) + (list?.limit ?? 0) >=
                    (list?.total ?? 0)
                  }
                >
                  Next
                </Button>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {(list?.markets ?? []).map((m) => {
                const active = selected?.slug === m.slug;
                return (
                  <button
                    key={m.slug}
                    onClick={() => setSelected(m)}
                    className={`w-full border-b border-[var(--line2)] px-3 py-2.5 text-left transition hover:bg-[var(--paper)] ${active ? "bg-[var(--paper)]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] truncate">
                        {m.title ?? m.labelLocal ?? m.slug}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${m.resolved ? "bg-[var(--line2)] text-[var(--muted)]" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {m.resolved ? "Resolved" : "Active"}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {new Date(m.startTs * 1000).toISOString().slice(0, 10)}{" "}
                      &rarr;{" "}
                      {new Date(m.endTs * 1000).toISOString().slice(0, 10)}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            {selected && (
              <div className="mb-3 text-[13px] font-medium truncate">
                {selected.title ?? selected.labelLocal ?? selected.slug}
              </div>
            )}
            <div className="h-[540px]">
              {market?.yesTokenHistory?.history?.length ? (
                <Line data={chartData as any} options={chartOptions as any} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                  Select a market to view its chart.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </Section>
  );
}
