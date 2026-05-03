"use client";

import { useAtom } from "jotai";
import { Activity, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  activeMarketSlug,
  bitstampPair,
  formatWindow,
} from "./active-market";
import { autoLayout } from "./auto-layout";
import { newId } from "./id";
import {
  edgesAtom,
  nodesAtom,
  selectedNodeIdAtom,
  isDirtyAtom,
} from "./store";
import {
  TRIGGERS,
  findActionByConfig,
  findTrigger,
  type FieldDef,
} from "./registry";

export default function NodeConfigPanel() {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [selectedId, setSelectedId] = useAtom(selectedNodeIdAtom);
  const [, setDirty] = useAtom(isDirtyAtom);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const updateConfig = useCallback(
    (key: string, value: unknown) => {
      if (!selected) return;
      setNodes((curr) =>
        curr.map((n) =>
          n.id === selected.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  config: { ...(n.data.config ?? {}), [key]: value },
                },
              }
            : n,
        ),
      );
      setDirty(true);
    },
    [selected, setNodes, setDirty],
  );

  const updateLabel = useCallback(
    (label: string) => {
      if (!selected) return;
      setNodes((curr) =>
        curr.map((n) =>
          n.id === selected.id ? { ...n, data: { ...n.data, label } } : n,
        ),
      );
      setDirty(true);
    },
    [selected, setNodes, setDirty],
  );

  const deleteNode = useCallback(() => {
    if (!selected) return;
    if (selected.data.type === "trigger") return; // trigger is required

    const incoming = edges.filter((e) => e.target === selected.id);
    const outgoing = edges.filter((e) => e.source === selected.id);

    const bridges = incoming.flatMap((i) =>
      outgoing.map((o) => {
        const targetNode = nodes.find((n) => n.id === o.target);
        const isAddTarget = targetNode?.type === "add";
        return {
          id: newId("e"),
          source: i.source,
          target: o.target,
          type: "smoothstep",
          animated: !isAddTarget,
          ...(isAddTarget ? { style: { strokeDasharray: "4 4" } } : {}),
        };
      }),
    );

    let nextNodes = nodes.filter((n) => n.id !== selected.id);
    let nextEdges = [
      ...edges.filter(
        (e) => e.source !== selected.id && e.target !== selected.id,
      ),
      ...bridges,
    ];

    // If the deleted node was the last real action and had no successor,
    // the predecessor is now a leaf — append a "+" placeholder after it.
    if (outgoing.length === 0) {
      for (const inc of incoming) {
        const stillHasOutgoing = nextEdges.some((e) => e.source === inc.source);
        if (!stillHasOutgoing) {
          const addId = newId("add");
          nextNodes = [
            ...nextNodes,
            {
              id: addId,
              type: "add",
              position: { x: 0, y: 0 },
              data: { type: "add", label: "" },
            },
          ];
          nextEdges = [
            ...nextEdges,
            {
              id: newId("e"),
              source: inc.source,
              target: addId,
              type: "smoothstep",
              style: { strokeDasharray: "4 4" },
            },
          ];
        }
      }
    }

    nextNodes = autoLayout(nextNodes, nextEdges);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedId(null);
    setDirty(true);
  }, [selected, nodes, edges, setNodes, setEdges, setSelectedId, setDirty]);

  if (!selected) {
    return (
      <aside className="flex h-full w-80 flex-col border-l border-[var(--line)] bg-[var(--white)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--ink)]">
            Properties
          </div>
        </div>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <p className="text-xs text-[var(--muted)]">
            Select a step to configure it.
          </p>
        </div>
      </aside>
    );
  }

  const isTrigger = selected.data.type === "trigger";
  let fields: FieldDef[] = [];
  let typeLabel = "";

  if (isTrigger) {
    const t = (selected.data.config?.triggerType as string) ?? "Manual";
    const def = findTrigger(t);
    fields = def?.fields ?? [];
    typeLabel = def?.label ?? t;
  } else {
    const it = selected.data.config?.integrationType as string | undefined;
    const at = selected.data.config?.actionType as string | undefined;
    const def = it && at ? findActionByConfig(it, at) : undefined;
    fields = def?.fields ?? [];
    typeLabel = def?.label ?? "Action";
  }

  return (
    <aside className="flex h-full w-80 flex-col border-l border-[var(--line)] bg-[var(--white)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {isTrigger ? "Trigger" : "Action"}
          </div>
          <div className="truncate text-sm font-semibold text-[var(--ink)]">
            {typeLabel}
          </div>
        </div>
        <button
          onClick={() => setSelectedId(null)}
          className="rounded-[var(--r)] p-1 text-[var(--muted)] hover:bg-[var(--line2)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Field label="Step name">
          <input
            value={selected.data.label ?? ""}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder={typeLabel}
            className="w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] px-2 py-1.5 text-sm outline-none focus:border-[var(--ink)]"
          />
        </Field>

        <ActiveMarketPreview config={selected.data.config ?? {}} />

        {isTrigger && (
          <Field label="Trigger type">
            <select
              value={(selected.data.config?.triggerType as string) ?? "Manual"}
              onChange={(e) => {
                updateConfig("triggerType", e.target.value);
              }}
              className="w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] px-2 py-1.5 text-sm outline-none focus:border-[var(--ink)]"
            >
              {TRIGGERS.map((t) => (
                <option key={t.triggerType} value={t.triggerType}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {fields.map((f) => (
          <FieldRenderer
            key={f.key}
            field={f}
            value={(selected.data.config?.[f.key] as never) ?? f.defaultValue}
            onChange={(v) => updateConfig(f.key, v)}
          />
        ))}
      </div>

      {!isTrigger && (
        <div className="border-t border-[var(--line)] p-3">
          <Button
            variant="danger"
            size="sm"
            onClick={deleteNode}
            className="w-full"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete step
          </Button>
        </div>
      )}
    </aside>
  );
}

function ActiveMarketPreview({ config }: { config: Record<string, unknown> }) {
  const asset = config.asset as string | undefined;
  const timeframe = config.timeframe as string | undefined;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!asset || !timeframe) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [asset, timeframe]);

  if (!asset || !timeframe) return null;
  const slug = activeMarketSlug(asset, timeframe);
  const window = formatWindow(timeframe);
  const pair = bitstampPair(asset);
  if (!slug) return null;

  return (
    <div
      key={tick}
      className="mb-4 rounded-[var(--r)] border border-[var(--line)] bg-[var(--line2)] px-3 py-2"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        <Activity className="h-3 w-3" />
        Active market right now
      </div>
      <div className="mt-1 break-all font-mono text-[11px] text-[var(--ink)]">
        {slug}
      </div>
      <div className="mt-0.5 text-[10px] text-[var(--muted)]">
        Window {window} · candles from {pair}
      </div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <label className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
        {label}
      </label>
      {children}
      {description && (
        <p className="mt-1 text-[10px] text-[var(--muted)]">{description}</p>
      )}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputCls =
    "w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--white)] px-2 py-1.5 text-sm outline-none focus:border-[var(--ink)]";

  return (
    <Field label={field.label} description={field.description}>
      {field.kind === "text" || field.kind === "cron" ? (
        <input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputCls}
        />
      ) : field.kind === "number" ? (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder={field.placeholder}
          className={inputCls}
        />
      ) : field.kind === "textarea" ? (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={5}
          className={cn(inputCls, "font-mono text-[11px]")}
        />
      ) : field.kind === "select" ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.kind === "boolean" ? (
        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--line)]"
          />
          <span className="text-xs text-[var(--muted)]">
            {field.placeholder ?? "Enabled"}
          </span>
        </label>
      ) : null}
    </Field>
  );
}
