"use client";
import { cn } from "@/lib/cn";
import React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--r)] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ink)] text-[var(--white)] hover:bg-[var(--ink2)] shadow-[var(--shadow-sm)]",
  secondary: "bg-[var(--line2)] text-[var(--ink)] hover:bg-[var(--line)]",
  outline:
    "border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line2)]",
  ghost: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line2)]",
  danger: "bg-[var(--rose)] text-white hover:bg-[var(--rose)]/90",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-8 px-3.5 text-[13px]",
  lg: "h-9 px-4 text-[13px]",
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
