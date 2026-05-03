"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type BotResponse = {
  id: string;
  name: string;
  status: string;
  keeperhubWorkflowId: string | null;
  editorUrl: string | null;
  webhookUrl: string | null;
  _count?: { trades: number };
};

export default function BotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [bot, setBot] = useState<BotResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bots/${botId}`);
    if (!res.ok) {
      toast({ variant: "error", title: "Bot not found" });
      router.push("/bots");
      return;
    }
    setBot(await res.json());
    setLoading(false);
  }, [botId, toast, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
  }, [status, load]);

  async function deleteBot() {
    if (
      !confirm(
        "Delete this bot? Its KeeperHub workflow will also be removed.",
      )
    )
      return;
    const res = await fetch(`/api/bots/${botId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ variant: "success", title: "Bot deleted" });
      router.push("/bots");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ variant: "success", title: "Copied" });
  }

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!bot) return null;

  const { editorUrl, webhookUrl } = bot;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{bot.name}</h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            KeeperHub workflow:{" "}
            <code className="text-[10px]">
              {bot.keeperhubWorkflowId ?? "—"}
            </code>
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={deleteBot}>
          Delete
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base mb-1">Workflow</CardTitle>
          <CardDescription className="text-xs mb-3">
            Drag triggers and actions to build your bot. Save when you&apos;re
            done — the bot picks up your changes on its next run.
          </CardDescription>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => router.push(`/bots/${botId}/edit`)}
            >
              Open editor →
            </Button>
            {editorUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(editorUrl, "_blank")}
              >
                Advanced (KeeperHub)
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base mb-1">Trigger URL</CardTitle>
          <CardDescription className="text-xs mb-2">
            POST any JSON to this URL to fire the workflow. Use it from
            TradingView, a script, or anywhere else.
          </CardDescription>
          <code className="block text-[10px] bg-[var(--line2)] text-[var(--ink)] p-2 rounded break-all">
            {webhookUrl ?? "—"}
          </code>
          {webhookUrl && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => copy(webhookUrl)}
            >
              Copy
            </Button>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}
