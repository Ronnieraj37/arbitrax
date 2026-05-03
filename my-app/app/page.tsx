"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, ShieldCheck, Zap, Globe, Cpu } from "lucide-react";
import Button from "@/components/ui/button";
import { HeroAnim } from "@/components/ui/hero-anim";
import { TradeTicker } from "@/components/ui/trade-ticker";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Markets Tracked", value: "850+", icon: Globe },
  { label: "Trades Executed", value: "42.1K", icon: Zap },
  { label: "Total Volume", value: "$8.4M", icon: BarChart3 },
];

const features = [
  {
    title: "Precision Backtesting",
    description: "Validate strategies against historical order book data with millisecond precision.",
    icon: BarChart3,
  },
  {
    title: "AI Signal Filtering",
    description: "Our proprietary ML models filter out low-conviction signals to maximize win rates.",
    icon: Cpu,
  },
  {
    title: "Secure Custody",
    description: "Managed and non-custodial wallet options with multi-sig security protocols.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--paper)]">
      {/* ── HERO SECTION ── */}
      <section className="relative pt-24 pb-20 overflow-hidden border-b border-[var(--line)]">
        {/* Background Decorative Blob */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-emerald-100/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-100/30 blur-[120px] rounded-full" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 uppercase tracking-widest mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Polymarket Intelligence v2.0
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                  <HeroAnim /> <br />
                  <span className="text-[var(--ink)]">Your Edge on Prediction Markets.</span>
                </h1>

                <p className="text-lg text-[var(--muted)] max-w-lg mb-8 leading-relaxed">
                  The ultimate bridge between TradingView strategies and Polymarket execution. 
                  High-frequency backtesting, real-time webhooks, and institutional-grade risk controls.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/auth/sign-up">
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50 flex items-center gap-2">
                      Get Started <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="lg" variant="outline" className="border-emerald-200 bg-white hover:bg-emerald-50 flex items-center gap-2 text-emerald-700">
                      Open Dashboard
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="lg:w-1/2 w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <TradeTicker />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="bg-white border-b border-[var(--line)]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-x border-[var(--line)]">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="py-10 flex flex-col items-center text-center"
              >
                <div className="mb-2 p-2 rounded-lg bg-[var(--line2)] text-emerald-600">
                  <stat.icon size={24} />
                </div>
                <div className="text-3xl font-bold tracking-tight text-[var(--ink)] mb-1">
                  {stat.value}
                </div>
                <div className="text-[12px] uppercase font-semibold text-[var(--muted2)] tracking-widest">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24 bg-[var(--paper)]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Institutional-Grade Infrastructure</h2>
            <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
              Built for speed, reliability, and precision. We handle the complexity so you can focus on the strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                whileHover={{ y: -8 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="py-20 bg-emerald-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-96 h-96 border-[40px] border-emerald-500/30 rounded-full" />
        <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-80 h-80 border-[30px] border-emerald-500/30 rounded-full" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Ready to scale your prediction strategy?</h2>
          <p className="text-emerald-50 text-lg mb-10 max-w-xl mx-auto">
            Join elite traders using ZLabs to automate their prediction market operations. 
            Free to get started, upgrade as you scale.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 px-10 shadow-xl">
                Start Trading Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-[var(--line)] py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">Z</div>
            <span className="font-bold text-lg tracking-tight">ZLabs</span>
          </div>
          <div className="flex gap-8 text-[13px] font-medium text-[var(--muted)]">
            <Link href="#" className="hover:text-[var(--ink)]">Terms</Link>
            <Link href="#" className="hover:text-[var(--ink)]">Privacy</Link>
            <Link href="#" className="hover:text-[var(--ink)]">Docs</Link>
            <Link href="#" className="hover:text-[var(--ink)]">API</Link>
          </div>
          <div className="text-[12px] text-[var(--muted2)]">
            © 2026 ZLabs Intelligence. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
