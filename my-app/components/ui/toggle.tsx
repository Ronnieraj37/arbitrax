"use client";
import { cn } from "@/lib/cn";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
};

export default function Toggle({ checked, onChange, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/20",
        checked ? "bg-[var(--ink)]" : "bg-[var(--line)]",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
