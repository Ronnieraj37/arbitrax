/**
 * Serializes our editor's `{ nodes, edges }` into the JSON shape KeeperHub
 * persists. We strip xyflow UI state and keep only what KH expects.
 */
import type { WorkflowEdge, WorkflowNode } from "./types";

export function toKeeperhubGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
} {
  // Drop "add" placeholder nodes — they're editor-only.
  const realNodes = nodes.filter((n) => n.type !== "add");
  const realIds = new Set(realNodes.map((n) => n.id));

  return {
    nodes: realNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        type: n.data.type,
        label: n.data.label ?? "",
        description: n.data.description ?? "",
        config: n.data.config ?? {},
        status: n.data.status ?? "idle",
        enabled: n.data.enabled ?? true,
      },
    })),
    edges: edges
      .filter((e) => realIds.has(e.source) && realIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        type: e.type ?? "smoothstep",
      })),
  };
}

export function fromKeeperhubGraph(
  rawNodes: unknown,
  rawEdges: unknown,
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const decoded: WorkflowNode[] = Array.isArray(rawNodes)
    ? rawNodes
        .filter((n): n is Record<string, unknown> => typeof n === "object" && n !== null)
        .map((n) => ({
          id: String(n.id),
          type: (n.type as string) ?? "action",
          position: (n.position as { x: number; y: number }) ?? { x: 0, y: 0 },
          data: {
            type:
              ((n.data as Record<string, unknown> | undefined)?.type as
                | "trigger"
                | "action"
                | "add") ?? "action",
            label:
              ((n.data as Record<string, unknown> | undefined)?.label as string) ??
              "",
            description:
              ((n.data as Record<string, unknown> | undefined)
                ?.description as string) ?? "",
            config:
              ((n.data as Record<string, unknown> | undefined)?.config as Record<
                string,
                unknown
              >) ?? {},
            status:
              ((n.data as Record<string, unknown> | undefined)?.status as
                | "idle"
                | "running"
                | "success"
                | "error") ?? "idle",
            enabled:
              ((n.data as Record<string, unknown> | undefined)?.enabled as boolean) ??
              true,
          },
        }))
    : [];

  // Drop unconfigured action nodes (KH seeds an empty action by default)
  const drop = new Set<string>();
  const nodes = decoded.filter((n) => {
    if (n.type !== "action") return true;
    const cfg = n.data.config ?? {};
    const ok = !!cfg.integrationType && !!cfg.actionType;
    if (!ok) drop.add(n.id);
    return ok;
  });

  const allEdges: WorkflowEdge[] = Array.isArray(rawEdges)
    ? rawEdges
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        .map((e) => ({
          id: String(e.id),
          source: String(e.source),
          target: String(e.target),
          sourceHandle: (e.sourceHandle as string | null) ?? null,
          targetHandle: (e.targetHandle as string | null) ?? null,
          type: (e.type as string) ?? "smoothstep",
          animated: true,
        }))
    : [];

  const edges = allEdges.filter(
    (e) => !drop.has(e.source) && !drop.has(e.target),
  );

  return { nodes, edges };
}

export function seedEmptyGraph(): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  const triggerId = `trigger_${Math.random().toString(36).slice(2, 8)}`;
  const addId = `add_${Math.random().toString(36).slice(2, 8)}`;
  return {
    nodes: [
      {
        id: triggerId,
        type: "trigger",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger",
          label: "",
          description: "",
          status: "idle",
          config: { triggerType: "Manual" },
        },
      },
      {
        id: addId,
        type: "add",
        position: { x: 300, y: 0 },
        data: { type: "add", label: "" },
      },
    ],
    edges: [
      {
        id: `e_${Math.random().toString(36).slice(2, 8)}`,
        source: triggerId,
        target: addId,
        type: "smoothstep",
        style: { strokeDasharray: "4 4" },
      },
    ],
  };
}

/**
 * Inserts an "add" placeholder after each leaf node so users can extend the
 * chain. Used after loading a workflow from the API.
 */
export function ensureAddPlaceholders(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const real = nodes.filter((n) => n.type !== "add");
  if (real.length === 0) return seedEmptyGraph();

  const realEdges = edges.filter((e) => {
    const t = nodes.find((n) => n.id === e.target);
    return t?.type !== "add";
  });

  const hasOutgoing = new Set(realEdges.map((e) => e.source));
  const leaves = real.filter((n) => !hasOutgoing.has(n.id));

  const newNodes: WorkflowNode[] = [...real];
  const newEdges: WorkflowEdge[] = [...realEdges];
  for (const leaf of leaves) {
    const addId = `add_${Math.random().toString(36).slice(2, 8)}`;
    newNodes.push({
      id: addId,
      type: "add",
      position: { x: leaf.position.x + 300, y: leaf.position.y },
      data: { type: "add", label: "" },
    });
    newEdges.push({
      id: `e_${Math.random().toString(36).slice(2, 8)}`,
      source: leaf.id,
      target: addId,
      type: "smoothstep",
      style: { strokeDasharray: "4 4" },
    });
  }
  return { nodes: newNodes, edges: newEdges };
}
