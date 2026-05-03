"use client";
import { cn } from "@/lib/cn";
import React from "react";

export default function Section({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mx-auto max-w-6xl px-4 py-8 sm:px-6", className)}>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
