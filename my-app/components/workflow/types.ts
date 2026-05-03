import type { Edge, Node } from "@xyflow/react";

export type WorkflowNodeKind = "trigger" | "action" | "add";

export type WorkflowTriggerType = "Manual" | "Schedule" | "Webhook";

export type NodeStatus = "idle" | "running" | "success" | "error";

export type WorkflowNodeData = {
  label: string;
  description?: string;
  type: WorkflowNodeKind;
  config?: Record<string, unknown>;
  status?: NodeStatus;
  enabled?: boolean;
  onClick?: () => void;
};

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};
