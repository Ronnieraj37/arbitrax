"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Section from "@/components/ui/section";
import { Card, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const PLANS: {
  id: "FREE" | "PRO" | "ENTERPRISE";
  price: string;
  features: string[];
}[] = [
  {
    id: "FREE",
    price: "$0",
    features: ["1 bot", "5 trades/day", "CSV backtests", "Webhook endpoint"],
  },
  {
    id: "PRO",
    price: "$29/mo",
    features: [
      "3 bots",
      "Unlimited trades",
      "Advanced toggles",
      "Priority support",
    ],
  },
  {
    id: "ENTERPRISE",
    price: "$99/mo",
    features: [
      "Unlimited bots",
      "Custom SL/TP logic",
      "SLA",
      "Dedicated support",
    ],
  },
];

export default function BillingPage() {
  const { data: session } = useSession();
  const { plan: currentPlan } = useCurrentUser();
  const { toast } = useToast();
  const [selected, setSelected] = useState<"FREE" | "PRO" | "ENTERPRISE">(
    currentPlan,
  );
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (selected === "FREE") {
      toast({ title: "You're already on the Free plan", variant: "success" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else
        toast({
          title: data.error || "Stripe not configured",
          variant: "error",
        });
    } catch {
      toast({ title: "Checkout failed", variant: "error" });
    }
    setLoading(false);
  }

  async function openPortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast({ title: data.error || "Portal unavailable", variant: "error" });
  }

  return (
    <Section
      title="Billing"
      description="Choose a plan that fits your trading needs."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => (
          <Card
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`cursor-pointer transition ${
              selected === p.id
                ? "border-[var(--ink)] shadow-[var(--shadow)]"
                : "hover:border-[var(--muted2)]"
            } ${currentPlan === p.id ? "ring-1 ring-emerald-500/30" : ""}`}
          >
            <div className="flex items-center gap-2">
              <CardTitle className="capitalize">{p.id.toLowerCase()}</CardTitle>
              {currentPlan === p.id && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Current
                </span>
              )}
            </div>
            <div className="mt-1 text-xl font-semibold">{p.price}</div>
            <ul className="mt-3 space-y-1 text-[13px] text-[var(--muted)]">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--muted2)]" />
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        {session?.user ? (
          <>
            <Button
              onClick={handleCheckout}
              disabled={loading || selected === currentPlan}
            >
              {loading
                ? "Redirecting..."
                : selected === currentPlan
                  ? "Current Plan"
                  : `Upgrade to ${selected}`}
            </Button>
            {currentPlan !== "FREE" && (
              <Button variant="outline" onClick={openPortal}>
                Manage Subscription
              </Button>
            )}
          </>
        ) : (
          <Button onClick={() => (window.location.href = "/auth/sign-in")}>
            Sign in to subscribe
          </Button>
        )}
      </div>
    </Section>
  );
}
