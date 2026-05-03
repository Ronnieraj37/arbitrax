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

type Bot = {
  id: string;
  name: string;
  status: string;
  keeperhubWorkflowId: string | null;
};

type BotResponse = {
  bot: Bot;
  editorUrl: string | null;
  webhookUrl: string | null;
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

  const [data, setData] = useState<BotResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bots/${botId}`);
    if (!res.ok) {
      toast({ variant: "error", title: "Bot not found" });
      router.push("/bots");
      return;
    }
    setData(await res.json());
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-screen w-full" />
      </div>
    );
  }
  if (!data) return null;

  const { bot, editorUrl, webhookUrl } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{bot.name}</h1>
          <p className="text-xs text-neutral-500 mt-1">
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
          <CardTitle className="text-base mb-1">Edit on KeeperHub</CardTitle>
          <CardDescription className="text-xs mb-3">
            Drag triggers, actions, and conditions on the KeeperHub canvas.
            Save in KeeperHub — your changes are picked up next time the
            workflow runs.
          </CardDescription>
          {editorUrl ? (
            <Button
              variant="primary"
              onClick={() => window.open(editorUrl, "_blank")}
            >
              Open editor on KeeperHub →
            </Button>
          ) : (
            <p className="text-xs text-neutral-500">
              Workflow not yet linked to KeeperHub.
            </p>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base mb-1">Trigger URL</CardTitle>
          <CardDescription className="text-xs mb-2">
            POST any JSON to this URL to fire the workflow. Use it from
            TradingView, a script, or anywhere else.
          </CardDescription>
          <div className="flex gap-2 items-start">
            <code className="flex-1 text-[10px] bg-neutral-900 text-neutral-200 p-2 rounded break-all">
              {webhookUrl ?? "—"}
            </code>
          </div>
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
