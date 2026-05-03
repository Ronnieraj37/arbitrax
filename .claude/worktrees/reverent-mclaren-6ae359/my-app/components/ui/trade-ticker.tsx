"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeEvent {
  id: string;
  market: string;
  side: "BUY" | "SELL";
  direction: "UP" | "DOWN";
  amount: number;
  time: string;
}

const MOCK_TRADES: TradeEvent[] = [
  { id: "1", market: "BTC Above $70k?", side: "BUY", direction: "UP", amount: 250.5, time: "Just now" },
  { id: "2", market: "ETH Over $4k?", side: "SELL", direction: "DOWN", amount: 120.0, time: "2m ago" },
  { id: "3", market: "Solana ATH in April?", side: "BUY", direction: "UP", amount: 45.3, time: "5m ago" },
  { id: "4", market: "Fed Rate Cut May?", side: "BUY", direction: "UP", amount: 1000.0, time: "8m ago" },
];

export function TradeTicker() {
  const [trades, setTrades] = useState<TradeEvent[]>(MOCK_TRADES);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTrade: TradeEvent = {
        id: Math.random().toString(),
        market: MOCK_TRADES[Math.floor(Math.random() * MOCK_TRADES.length)].market,
        side: Math.random() > 0.5 ? "BUY" : "SELL",
        direction: Math.random() > 0.5 ? "UP" : "DOWN",
        amount: Math.floor(Math.random() * 500) + 10,
        time: "Just now",
      };
      setTrades((prev) => [newTrade, ...prev.slice(0, 5)]);
    }, 4000); // New trade every 4s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)]/50 p-4 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-[var(--line)] pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-500 animate-pulse" />
          Live Trade Feed
        </h3>
        <span className="text-[11px] text-[var(--muted)] font-mono">REAL-TIME BRIDGE</span>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {trades.map((trade) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--line)] bg-white/40 shadow-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "p-2 rounded-full",
                  trade.direction === "UP" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {trade.direction === "UP" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[13px] font-medium truncate">{trade.market}</div>
                  <div className="text-[11px] text-[var(--muted)]">{trade.time}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={cn(
                  "text-[13px] font-bold",
                  trade.side === "BUY" ? "text-emerald-600" : "text-amber-600"
                )}>
                  {trade.side} ${trade.amount.toFixed(2)}
                </div>
                <div className="text-[11px] text-[var(--muted)] font-mono">
                  PENDING...
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fade overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--paper)] to-transparent pointer-events-none" />
    </div>
  );
}
