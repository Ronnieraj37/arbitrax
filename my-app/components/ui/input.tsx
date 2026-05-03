"use client";
import { cn } from "@/lib/cn";
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] px-3 py-1.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted2)] outline-none transition focus:border-[var(--ink3)] focus:ring-1 focus:ring-[var(--ink3)]/20",
        className,
      )}
      {...props}
    />
  );
}
