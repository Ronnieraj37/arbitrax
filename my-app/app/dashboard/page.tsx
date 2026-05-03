"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

type Bot = {
  id: string;
  name: string;
  status: string;
  keeperhubWorkflowId: string | null;
  _count?: { trades: number };
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bots");
      const json = await res.json();
      setBots(json.bots ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) fetchBots();
  }, [session, fetchBots]);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48 mb-3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to view your dashboard</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-[var(--muted)]">
            Bots are KeeperHub workflows. Build them on KeeperHub, fire them
            from anywhere.
          </p>
        </div>
        <Link href="/bots">
          <Button variant="primary">Build a bot →</Button>
        </Link>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No bots yet</CardTitle>
            <CardDescription>
              Create your first KeeperHub-powered bot.
            </CardDescription>
            <Link href="/bots" className="mt-3 inline-block">
              <Button variant="primary" size="sm">
                Get started →
              </Button>
            </Link>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bots.map((b) => (
            <Link key={b.id} href={`/bots/${b.id}`}>
              <Card className="cursor-pointer hover:border-[var(--ink2)] transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--muted)]">
                      {b.status}
                    </span>
                  </div>
                  <CardDescription className="text-[11px] mt-1">
                    {b._count?.trades ?? 0} runs
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
