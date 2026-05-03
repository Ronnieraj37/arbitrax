"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bots", label: "Bots" },
  { href: "/markets", label: "Markets" },
  { href: "/backtest", label: "Backtest" },
  { href: "/billing", label: "Billing" },
];

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--line)] bg-[var(--white)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-[5px] bg-[var(--ink)] text-[10px] font-bold text-white">
            A
          </div>
          <span className="text-sm font-semibold tracking-tight">Arbitrax</span>
        </Link>

        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-[var(--r)] px-3 py-1.5 text-[13px] transition ${
                pathname === n.href || pathname.startsWith(n.href + "/")
                  ? "font-medium text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded-[var(--r)] px-3 py-1 text-[12px] text-[var(--muted)] transition hover:text-[var(--ink)] hover:bg-[var(--line2)]"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth/sign-in"
              className="rounded-[var(--r)] bg-[var(--ink)] px-3 py-1 text-[12px] font-medium text-white transition hover:bg-[var(--ink2)]"
            >
              Sign in
            </Link>
          )}
          <button
            className="rounded-[var(--r)] p-1.5 text-[var(--muted)] hover:bg-[var(--line2)] sm:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {open ? (
                <path d="M4 4l8 8M12 4l-8 8" />
              ) : (
                <path d="M2 4h12M2 8h12M2 12h12" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--line)] bg-[var(--white)] px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`rounded-[var(--r)] px-3 py-2 text-sm transition ${
                  pathname === n.href
                    ? "bg-[var(--line2)] font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
