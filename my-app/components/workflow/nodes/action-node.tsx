"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/cn";
import { ACTION_ICONS } from "../icons";
import { findActionByConfig } from "../registry";
import type { WorkflowNodeData } from "../types";

type ActionNodeProps = NodeProps & { data?: WorkflowNodeData };

export const ActionNode = memo(function ActionNode({
  data,
  selected,
}: ActionNodeProps) {
  if (!data) return null;
  const integrationType = data.config?.integrationType as string | undefined;
  const actionType = data.config?.actionType as string | undefined;
  const def =
    integrationType && actionType
      ? findActionByConfig(integrationType, actionType)
      : undefined;

  const Icon = def ? ACTION_ICONS[def.iconName] : Box;
  const title = data.label || def?.label || "Choose action";
  const description = data.description || def?.description || "Click to configure";
  const isUnconfigured = !def;

  return (
    <div
      className={cn(
        "relative flex h-[100px] w-[220px] items-center gap-3 rounded-[var(--r)] border bg-[var(--white)] px-4 transition-all",
        selected
          ? "border-[var(--ink)] shadow-[0_0_0_3px_var(--line2)]"
          : "border-[var(--line)] hover:border-[var(--ink2)]",
        isUnconfigured && "border-dashed",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[var(--white)] !bg-[var(--ink)]"
      />
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r)]",
          isUnconfigured
            ? "bg-[var(--line2)] text-[var(--muted)]"
            : "bg-[var(--line2)] text-[var(--ink)]",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          {def?.category ?? "Action"}
        </div>
        <div className="truncate text-sm font-semibold text-[var(--ink)]">
          {title}
        </div>
        <div className="truncate text-[11px] text-[var(--muted)]">
          {description}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-[var(--white)] !bg-[var(--ink)]"
      />
    </div>
  );
});
