"use client";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--white)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Arbitrax"
            width={80}
            height={24}
            className="h-6 w-auto object-contain opacity-70"
          />
          <span className="text-[12px] text-[var(--muted)]">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex items-center gap-4 text-[12px]">
          <Link
            href="/markets"
            className="text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            Markets
          </Link>
          <Link
            href="/backtest"
            className="text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            Backtest
          </Link>
          <Link
            href="/dashboard"
            className="text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            Dashboard
          </Link>
          <Link
            href="/billing"
            className="text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            Pricing
          </Link>
        </nav>
      </div>
    </footer>
  );
}
