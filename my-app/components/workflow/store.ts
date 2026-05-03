import { atom } from "jotai";
import type { WorkflowEdge, WorkflowNode } from "./types";

export const nodesAtom = atom<WorkflowNode[]>([]);
export const edgesAtom = atom<WorkflowEdge[]>([]);
export const selectedNodeIdAtom = atom<string | null>(null);
export const isDirtyAtom = atom<boolean>(false);
export const isSavingAtom = atom<boolean>(false);
export const workflowIdAtom = atom<string | null>(null);
export const workflowNameAtom = atom<string>("");
