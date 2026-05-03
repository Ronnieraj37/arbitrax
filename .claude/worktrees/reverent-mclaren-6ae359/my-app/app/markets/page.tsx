"use client";
import { useEffect, useState, useCallback } from "react";
import Section from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import Link from "next/link";

type BtcMarket = {
  slug: string;
  timeframe: string;
  startTs: number;
  endTs: number;
  upTokenId: string;
  downTokenId: string;
  upPrice: number | null;
  downPrice: number | null;
  status: "active" | "upcoming" | "ended";
  timeLeftSec: number;
};

const TF_LABELS: Record<string, string> = {
  "15m": "15 Min",
  "1h": "1 Hour",
  "4h": "4 Hour",
  "1d": "Daily",
};

function formatTimeLeft(sec: number): string {
  if (sec <= 0) return "Ended";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  });
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<BtcMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch("/api/markets", { cache: "no-store" });
      const json = await res.json();
      if (json.markets?.length > 0) {
        setMarkets(json.markets);
        setError(null);
      } else if (json.error) {
        setError(json.error);
      } else {
        setMarkets([]);
      }
    } catch {
      setError("Failed to connect to market API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30_000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered =
    filter === "all" ? markets : markets.filter((m) => m.timeframe === filter);
  const activeCount = markets.filter((m) => m.status === "active").length;

  return (
    <Section
      title="BTC Markets"
      description="Live Bitcoin up/down markets on Polymarket."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5">
          {["all", "15m", "1h", "4h", "1d"].map((tf) => {
            const count =
              tf === "all"
                ? markets.length
                : markets.filter((m) => m.timeframe === tf).length;
            return (
              <button
                key={tf}
                onClick={() => setFilter(tf)}
                className={`rounded-[var(--r)] px-2.5 py-1 text-[12px] font-medium transition ${
                  filter === tf
                    ? "bg-[var(--ink)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line2)]"
                }`}
              >
                {tf === "all" ? "All" : TF_LABELS[tf]} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
          <Link
            href="/markets/graphs"
            className="hover:text-[var(--ink)] transition"
          >
            Graphs
          </Link>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {activeCount} active
          </span>
          <button
            onClick={fetchMarkets}
            className="hover:text-[var(--ink)] transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--r-lg)]" />
          ))}
        </div>
      ) : error ? (
        <Card className="py-8 text-center">
          <p className="text-sm text-[var(--rose)]">{error}</p>
          <button
            onClick={fetchMarkets}
            className="mt-2 text-[12px] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Try again
          </button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            No {filter !== "all" ? TF_LABELS[filter] : ""} markets available
            right now.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MarketCard key={m.slug} m={m} />
          ))}
        </div>
      )}
    </Section>
  );
}

function MarketCard({ m }: { m: BtcMarket }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const timeLeft = m.endTs - nowSec;
  const isActive = m.status === "active";

  const upPct = m.upPrice != null ? (m.upPrice * 100).toFixed(1) : "--";
  const downPct = m.downPrice != null ? (m.downPrice * 100).toFixed(1) : "--";
  const upWinning =
    m.upPrice != null && m.downPrice != null && m.upPrice > m.downPrice;
  const downWinning =
    m.upPrice != null && m.downPrice != null && m.downPrice > m.upPrice;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-[5px] bg-[var(--line2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
            {TF_LABELS[m.timeframe] ?? m.timeframe}
          </span>
          <span className="text-[12px] text-[var(--muted)]">BTC Up/Down</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span
            className={`text-[12px] font-medium ${isActive ? "text-emerald-600" : "text-[var(--muted)]"}`}
          >
            {isActive
              ? formatTimeLeft(timeLeft)
              : m.status === "upcoming"
                ? "Starting soon"
                : "Ended"}
          </span>
        </div>
      </div>

      <div className="text-[12px] text-[var(--muted)] mb-3">
        {formatDate(m.startTs)} &middot; {formatTime(m.startTs)} &rarr;{" "}
        {formatTime(m.endTs)} ET
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded-[var(--r)] border p-2.5 text-center ${upWinning ? "border-emerald-200 bg-emerald-50" : "border-[var(--line)] bg-[var(--paper)]"}`}
        >
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Up
          </div>
          <div
            className={`mt-0.5 text-lg font-semibold tabular-nums ${upWinning ? "text-emerald-600" : ""}`}
          >
            {upPct}
            <span className="text-[12px] font-normal">&cent;</span>
          </div>
        </div>
        <div
          className={`rounded-[var(--r)] border p-2.5 text-center ${downWinning ? "border-rose-200 bg-rose-50" : "border-[var(--line)] bg-[var(--paper)]"}`}
        >
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Down
          </div>
          <div
            className={`mt-0.5 text-lg font-semibold tabular-nums ${downWinning ? "text-rose-600" : ""}`}
          >
            {downPct}
            <span className="text-[12px] font-normal">&cent;</span>
          </div>
        </div>
      </div>

      {isActive && m.upPrice != null && m.downPrice != null && (
        <div className="mt-2.5 flex h-1 overflow-hidden rounded-full bg-[var(--line2)]">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${m.upPrice * 100}%` }}
          />
          <div
            className="bg-rose-400 transition-all duration-500"
            style={{ width: `${m.downPrice * 100}%` }}
          />
        </div>
      )}
    </Card>
  );
}
