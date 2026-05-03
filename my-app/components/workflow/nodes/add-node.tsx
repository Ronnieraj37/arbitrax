"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { memo } from "react";

type AddNodeData = { onClick?: () => void };

export const AddNode = memo(function AddNode({
  data,
}: NodeProps & { data?: AddNodeData }) {
  return (
    <div
      onClick={data?.onClick}
      className="flex h-[100px] w-[220px] cursor-pointer items-center justify-center gap-2 rounded-[var(--r)] border border-dashed border-[var(--line)] bg-transparent text-[var(--muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[var(--white)] !bg-[var(--line)]"
      />
      <Plus className="h-4 w-4" />
      <span className="text-sm font-medium">Add step</span>
    </div>
  );
});
