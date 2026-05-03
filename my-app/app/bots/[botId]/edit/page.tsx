"use client";

import { Provider as JotaiProvider, useAtom } from "jotai";
import { ArrowLeft, ExternalLink, Loader2, Play, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  edgesAtom,
  isDirtyAtom,
  isSavingAtom,
  nodesAtom,
  selectedNodeIdAtom,
  workflowIdAtom,
  workflowNameAtom,
} from "@/components/workflow/store";
import { autoLayout } from "@/components/workflow/auto-layout";
import NodeConfigPanel from "@/components/workflow/node-config-panel";
import {
  ensureAddPlaceholders,
  fromKeeperhubGraph,
  toKeeperhubGraph,
} from "@/components/workflow/serialize";
import dynamic from "next/dynamic";

const WorkflowCanvas = dynamic(
  () => import("@/components/workflow/workflow-canvas"),
  { ssr: false },
);

export default function BotEditorPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  return (
    <JotaiProvider>
      <BotEditorInner params={params} />
    </JotaiProvider>
  );
}

function BotEditorInner({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [, setSelectedId] = useAtom(selectedNodeIdAtom);
  const [dirty, setDirty] = useAtom(isDirtyAtom);
  const [saving, setSaving] = useAtom(isSavingAtom);
  const [workflowId, setWfId] = useAtom(workflowIdAtom);
  const [name, setName] = useAtom(workflowNameAtom);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/bots/${botId}/workflow`);
        if (!res.ok) {
          throw new Error((await res.json())?.error || "Failed to load");
        }
        const json = await res.json();
        if (!alive) return;
        setWfId(json.bot?.keeperhubWorkflowId ?? null);
        setName(json.name ?? json.bot?.name ?? "");

        const decoded = fromKeeperhubGraph(json.nodes, json.edges);
        const withAdds = ensureAddPlaceholders(decoded.nodes, decoded.edges);
        const laidOut = autoLayout(withAdds.nodes, withAdds.edges);
        setNodes(laidOut);
        setEdges(withAdds.edges);
        setSelectedId(null);
        setDirty(false);
      } catch (e) {
        toast({
          variant: "error",
          title: "Failed to load workflow",
          description: String(e),
        });
        router.push(`/bots/${botId}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, botId]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = toKeeperhubGraph(nodes, edges);
      const res = await fetch(`/api/bots/${botId}/workflow`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Save failed");
      }
      setDirty(false);
      toast({ variant: "success", title: "Workflow saved" });
    } catch (e) {
      toast({
        variant: "error",
        title: "Save failed",
        description: String(e),
      });
    } finally {
      setSaving(false);
    }
  }, [botId, nodes, edges, name, setSaving, setDirty, toast]);

  const runOnce = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/bots/${botId}/run`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Run failed");
      }
      toast({ variant: "success", title: "Trigger fired" });
    } catch (e) {
      toast({
        variant: "error",
        title: "Run failed",
        description: String(e),
      });
    } finally {
      setRunning(false);
    }
  }, [botId, toast]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl+S → save
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, save]);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--white)] px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push(`/bots/${botId}`)}
            className="rounded-[var(--r)] p-1.5 text-[var(--muted)] hover:bg-[var(--line2)] hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            placeholder="Workflow name"
            className="min-w-0 flex-1 rounded-[var(--r)] bg-transparent px-2 py-1 text-sm font-semibold text-[var(--ink)] outline-none focus:bg-[var(--line2)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/markets"
            target="_blank"
            className="hidden items-center gap-1 rounded-[var(--r)] px-2 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--line2)] hover:text-[var(--ink)] sm:inline-flex"
          >
            Markets
            <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            onClick={runOnce}
            disabled={dirty || running || !workflowId}
            title={dirty ? "Save first" : "Fire the trigger once"}
            className="hidden items-center gap-1 rounded-[var(--r)] border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--line2)] hover:text-[var(--ink)] disabled:opacity-40 sm:inline-flex"
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Test run
          </button>
          {dirty && (
            <span className="text-[11px] text-[var(--muted)]">
              Unsaved <span className="opacity-60">⌘S</span>
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <WorkflowCanvas />
        </div>
        <NodeConfigPanel />
      </div>
    </div>
  );
}
