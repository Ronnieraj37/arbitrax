"use client";
import React, { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
  duration?: number;
};

type ToastContextValue = {
  toast: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = (t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, duration: 2500, variant: "default", ...t };
    setItems((prev) => [...prev, item]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, item.duration);
  };

  const value = useMemo(() => ({ toast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            className={cn(
              "pointer-events-auto rounded-[var(--r)] border px-4 py-3 shadow-md animate-in slide-in-from-top-2 fade-in",
              i.variant === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              i.variant === "error" &&
                "border-rose-200 bg-rose-50 text-rose-900",
              i.variant === "default" &&
                "border-[var(--line)] bg-[var(--white)] text-[var(--ink)]",
            )}
            role="status"
          >
            <div className="text-[13px] font-medium">{i.title}</div>
            {i.description && (
              <div className="mt-0.5 text-[12px] opacity-70">
                {i.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
