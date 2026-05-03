"use client";
import { cn } from "@/lib/cn";

export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--r)] bg-[var(--line2)]",
        className,
      )}
    />
  );
}
