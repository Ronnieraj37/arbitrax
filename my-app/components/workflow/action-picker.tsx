"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ACTION_ICONS } from "./icons";
import { ACTIONS, type ActionDef } from "./registry";

type Category = "all" | "polymarket" | "logic" | "io";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "polymarket", label: "Polymarket" },
  { id: "logic", label: "Logic" },
  { id: "io", label: "I/O" },
];

export default function ActionPicker({
  onPick,
  onClose,
}: {
  onPick: (def: ActionDef) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const filtered = useMemo(() => {
    return ACTIONS.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--line)] p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actions"
              className="w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] py-2 pl-8 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--ink)]"
            />
          </div>
          <div className="mt-2 flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-[var(--r)] px-2 py-1 text-[11px] font-medium transition",
                  category === c.id
                    ? "bg-[var(--ink)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--line2)]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--muted)]">
              No actions match
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((a) => {
                const Icon = ACTION_ICONS[a.iconName];
                return (
                  <button
                    key={a.id}
                    onClick={() => onPick(a)}
                    className="flex items-start gap-3 rounded-[var(--r)] p-2 text-left transition hover:bg-[var(--line2)]"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r)] bg-[var(--line2)] text-[var(--ink)]">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--ink)]">
                        {a.label}
                      </div>
                      <div className="truncate text-[11px] text-[var(--muted)]">
                        {a.description}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--line)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">
                      {a.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
