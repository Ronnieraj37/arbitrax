"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { cn } from "@/lib/cn";
import { TRIGGER_ICONS } from "../icons";
import type { WorkflowNodeData } from "../types";

type TriggerNodeProps = NodeProps & { data?: WorkflowNodeData };

export const TriggerNode = memo(function TriggerNode({
  data,
  selected,
}: TriggerNodeProps) {
  if (!data) return null;
  const triggerType = (data.config?.triggerType as string) || "Manual";
  const Icon = TRIGGER_ICONS[triggerType] ?? TRIGGER_ICONS.Manual;
  const title = data.label || triggerType;

  return (
    <div
      className={cn(
        "relative flex h-[100px] w-[220px] items-center gap-3 rounded-[var(--r)] border bg-[var(--white)] px-4 transition-all",
        selected
          ? "border-[var(--ink)] shadow-[0_0_0_3px_var(--line2)]"
          : "border-[var(--line)] hover:border-[var(--ink2)]",
      )}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r)] bg-[var(--ink)] text-white">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          Trigger
        </div>
        <div className="truncate text-sm font-semibold text-[var(--ink)]">
          {title}
        </div>
        {data.description && (
          <div className="truncate text-[11px] text-[var(--muted)]">
            {data.description}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-[var(--white)] !bg-[var(--ink)]"
      />
    </div>
  );
});
