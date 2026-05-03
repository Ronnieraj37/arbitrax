"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type Bot = {
  id: string;
  name: string;
  status: string;
  keeperhubWorkflowId: string | null;
  editorUrl: string | null;
  webhookUrl: string | null;
  _count?: { trades: number };
};

export default function BotsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/bots");
        const json = await res.json();
        if (!alive) return;
        setBots(json.bots ?? []);
      } catch (e) {
        toast({
          variant: "error",
          title: "Failed to load bots",
          description: String(e),
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, toast]);

  async function createBot() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ variant: "error", title: "Name required" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || "Failed");
      router.push(`/bots/${json.bot.id}`);
    } catch (e) {
      toast({
        variant: "error",
        title: "Could not create bot",
        description: String(e),
      });
      setBusy(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to build bots</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Your bots</h1>
        <p className="text-sm text-neutral-500">
          Each bot is a KeeperHub workflow. Hit Create — you&apos;ll be dropped
          into the KeeperHub editor to drag together your strategy.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base mb-1">Create a new bot</CardTitle>
          <CardDescription className="text-xs mb-3">
            ZLabs creates an empty KeeperHub workflow and opens its editor.
            You build the rest there.
          </CardDescription>
          <div className="flex gap-2">
            <Input
              placeholder="Bot name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBot();
              }}
            />
            <Button onClick={createBot} disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {bots.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No bots yet. Create your first one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bots.map((b) => (
            <Card
              key={b.id}
              className="cursor-pointer hover:border-emerald-600 transition"
              onClick={() => router.push(`/bots/${b.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      b.status === "ACTIVE"
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <CardDescription className="text-xs">
                  {b._count?.trades ?? 0} trades
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
