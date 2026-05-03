"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAtom } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { ActionNode } from "./nodes/action-node";
import { AddNode } from "./nodes/add-node";
import { TriggerNode } from "./nodes/trigger-node";
import {
  edgesAtom,
  isDirtyAtom,
  nodesAtom,
  selectedNodeIdAtom,
} from "./store";
import type { WorkflowEdge, WorkflowNode } from "./types";
import ActionPicker from "./action-picker";
import { autoLayout } from "./auto-layout";
import { newId } from "./id";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  add: AddNode,
};

function CanvasInner() {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [selectedId, setSelectedId] = useAtom(selectedNodeIdAtom);
  const [, setDirty] = useAtom(isDirtyAtom);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSourceId, setPickerSourceId] = useState<string | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((curr) => applyNodeChanges(changes, curr) as WorkflowNode[]);
      const hasMove = changes.some(
        (c) => c.type === "position" || c.type === "remove",
      );
      if (hasMove) setDirty(true);
    },
    [setNodes, setDirty],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((curr) => applyEdgeChanges(changes, curr) as WorkflowEdge[]);
      if (changes.some((c) => c.type === "remove")) setDirty(true);
    },
    [setEdges, setDirty],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((curr) =>
        addEdge(
          { ...conn, id: newId("e"), type: "smoothstep", animated: true },
          curr,
        ) as WorkflowEdge[],
      );
      setDirty(true);
    },
    [setEdges, setDirty],
  );

  const openPickerFrom = useCallback((sourceId: string | null) => {
    setPickerSourceId(sourceId);
    setPickerOpen(true);
  }, []);

  const decoratedNodes = useMemo<WorkflowNode[]>(() => {
    return nodes.map((n) =>
      n.type === "add"
        ? {
            ...n,
            data: { ...n.data, onClick: () => openPickerFrom(findAddSource(n.id, edges)) },
          }
        : n,
    );
  }, [nodes, edges, openPickerFrom]);

  const handlePick = useCallback(
    (def: import("./registry").ActionDef) => {
      const newNodeId = newId("n");
      const sourceId = pickerSourceId;
      const baseNode: WorkflowNode = {
        id: newNodeId,
        type: "action",
        position: { x: 0, y: 0 },
        data: {
          type: "action",
          label: "",
          description: "",
          status: "idle",
          config: {
            integrationType: def.integrationType,
            actionType: def.actionType,
            ...Object.fromEntries(
              def.fields
                .filter((f) => f.defaultValue !== undefined)
                .map((f) => [f.key, f.defaultValue]),
            ),
          },
        },
      };

      let nextNodes = [...nodes.filter((n) => n.type !== "add"), baseNode];
      let nextEdges = edges.filter((e) => !isAddEdge(e, nodes));
      if (sourceId) {
        nextEdges = [
          ...nextEdges,
          {
            id: newId("e"),
            source: sourceId,
            target: newNodeId,
            type: "smoothstep",
            animated: true,
          },
        ];
      }

      // Re-add a dangling "add" placeholder after the new action
      const addId = newId("n");
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
          source: newNodeId,
          target: addId,
          type: "smoothstep",
          animated: false,
          style: { strokeDasharray: "4 4" },
        },
      ];

      nextNodes = autoLayout(nextNodes, nextEdges);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedId(newNodeId);
      setDirty(true);
      setPickerOpen(false);
      setPickerSourceId(null);
    },
    [nodes, edges, pickerSourceId, setNodes, setEdges, setSelectedId, setDirty],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={decoratedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (node.type === "add") return;
          setSelectedId(node.id);
        }}
        onPaneClick={() => setSelectedId(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep", animated: true }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--line)"
        />
        <Controls
          showInteractive={false}
          className="!rounded-[var(--r)] !border !border-[var(--line)] !bg-[var(--white)] !shadow-sm"
        />
        <MiniMap
          pannable
          zoomable
          className="!rounded-[var(--r)] !border !border-[var(--line)] !bg-[var(--white)]"
          nodeColor="var(--ink)"
          maskColor="rgba(255,255,255,0.7)"
        />
      </ReactFlow>

      {pickerOpen && (
        <ActionPicker
          onPick={handlePick}
          onClose={() => {
            setPickerOpen(false);
            setPickerSourceId(null);
          }}
        />
      )}
    </div>
  );
}

function findAddSource(addId: string, edges: WorkflowEdge[]): string | null {
  const incoming = edges.find((e) => e.target === addId);
  return incoming?.source ?? null;
}

function isAddEdge(edge: WorkflowEdge, nodes: WorkflowNode[]): boolean {
  const target = nodes.find((n) => n.id === edge.target);
  return target?.type === "add";
}

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
