"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  useNodesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Contact, Factory, Network, Stage } from "@/lib/types";
import { StagePill } from "./stage-pill";
import { Button } from "@/design-system/components/button";

type Kind = "root" | "network" | "factory" | "contact";
type NodeData = {
  kind: Kind;
  label: string;
  sub?: string | null;
  score?: number | null;
  grade?: string | null;
  stage?: Stage;
  alert?: boolean;
  target?: boolean;
};
type FlowNode = Node<NodeData>;

const COL_W = 350;
const ROW_H = 58;
const ROOT_GAP = 34;
const POS_KEY = "map:positions:v1";

const nodeTypes = { entity: EntityNode };

type Filters = { vertical: string; grade: string; showContacts: boolean };
type Pos = Record<string, { x: number; y: number }>;

function loadPos(): Pos {
  try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch { return {}; }
}
function savePos(p: Pos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore quota */ }
}

type MapCanvasProps = {
  networks: Network[];
  factories: Factory[];
  contactsOf: (factoryId: string) => Contact[];
  contactsOfNetwork: (networkId: string) => Contact[];
  factoriesOfNetwork: (networkId: string) => Factory[];
  alertIds: Set<string>;
  filters: Filters;
  colorMode: "light" | "dark";
  onOpen: (kind: Kind, id: string) => void;
  onReparent: (factoryId: string, networkId: string | null) => void;
};

// getIntersectingNodes (drag-to-reparent) needs the ReactFlow context.
export function MapCanvas(props: MapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function MapCanvasInner({
  networks,
  factories,
  contactsOf,
  contactsOfNetwork,
  factoriesOfNetwork,
  alertIds,
  filters,
  colorMode,
  onOpen,
  onReparent,
}: MapCanvasProps) {
  // Auto-layout the tree from live store data. Positions here are the *defaults*;
  // user drags override them (persisted to localStorage) and survive re-layout.
  const { layoutNodes, edges } = useMemo(() => {
    const visible = (f: Factory) =>
      (filters.vertical === "All" || f.vertical_id === filters.vertical) &&
      (filters.grade === "All" || f.grade === filters.grade);

    type TNode = { id: string; depth: number; data: NodeData; children: TNode[]; x: number; y: number };

    const contactNode = (c: Contact): TNode => ({
      id: `c_${c.id}`, depth: 2, x: 0, y: 0, children: [],
      data: { kind: "contact", label: c.full_name, sub: c.role_title, stage: c.stage, alert: alertIds.has(c.id), target: c.is_primary_target },
    });
    const factoryNode = (f: Factory): TNode => ({
      id: `f_${f.id}`, depth: 1, x: 0, y: 0,
      children: filters.showContacts ? contactsOf(f.id).map(contactNode) : [],
      data: { kind: "factory", label: f.name, sub: f.hq_location, score: f.score, grade: f.grade, stage: f.stage, alert: alertIds.has(f.id) },
    });

    const roots: TNode[] = [];
    for (const net of [...networks].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))) {
      const facNodes = factoriesOfNetwork(net.id).filter(visible).map(factoryNode);
      const directContacts = filters.showContacts ? contactsOfNetwork(net.id).map(contactNode) : [];
      roots.push({
        id: `n_${net.id}`, depth: 0, x: 0, y: 0, children: [...facNodes, ...directContacts],
        data: { kind: "network", label: net.name, sub: net.type, score: net.score, grade: net.grade, stage: net.stage, alert: alertIds.has(net.id) },
      });
    }
    const directFacs = factories.filter((f) => !f.network_id && visible(f));
    if (directFacs.length) {
      roots.push({
        id: "root_direct", depth: 0, x: 0, y: 0,
        children: directFacs.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map(factoryNode),
        data: { kind: "root", label: "Direct / unsourced", sub: `${directFacs.length} factories` },
      });
    }

    let cursorY = 0;
    const place = (node: TNode): number => {
      node.x = node.depth * COL_W;
      if (!node.children.length) {
        node.y = cursorY;
        cursorY += ROW_H;
        return node.y;
      }
      const ys = node.children.map(place);
      node.y = (ys[0] + ys[ys.length - 1]) / 2;
      return node.y;
    };
    for (const r of roots) {
      place(r);
      cursorY += ROOT_GAP;
    }

    const layoutNodes: FlowNode[] = [];
    const edges: Edge[] = [];
    const walk = (node: TNode, parentId: string | null) => {
      layoutNodes.push({ id: node.id, position: { x: node.x, y: node.y }, data: node.data, type: "entity" });
      if (parentId)
        edges.push({ id: `${parentId}>${node.id}`, source: parentId, target: node.id, type: "smoothstep" });
      node.children.forEach((ch) => walk(ch, node.id));
    };
    roots.forEach((r) => walk(r, null));
    return { layoutNodes, edges };
  }, [networks, factories, contactsOf, contactsOfNetwork, factoriesOfNetwork, alertIds, filters]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const posRef = useRef<Pos>({});
  const { getIntersectingNodes } = useReactFlow();
  const factoryNet = useMemo(() => new Map(factories.map((f) => [f.id, f.network_id ?? null])), [factories]);

  // Load saved drag positions once (client only).
  useEffect(() => { posRef.current = loadPos(); }, []);

  // Reconcile whenever the layout changes: keep fresh data + edges, but preserve
  // the current on-screen position (drag) or a saved position for each node.
  useEffect(() => {
    setNodes((curr) => {
      const currPos = new Map(curr.map((n) => [n.id, n.position]));
      return layoutNodes.map((ln) => ({
        ...ln,
        position: currPos.get(ln.id) ?? posRef.current[ln.id] ?? ln.position,
      }));
    });
  }, [layoutNodes, setNodes]);

  const onNodeDragStop = useCallback((_: unknown, node: FlowNode) => {
    // Drop a factory onto a network (or the Direct bucket) to re-link it.
    if (node.id.startsWith("f_")) {
      const target = getIntersectingNodes(node).find((t) => t.id.startsWith("n_") || t.id === "root_direct");
      if (target) {
        const factoryId = node.id.slice(2);
        const newNet = target.id === "root_direct" ? null : target.id.slice(2);
        const currentNet = factoryNet.get(factoryId) ?? null;
        if (newNet !== currentNet) {
          const next = { ...posRef.current };
          delete next[node.id]; // clear override so it re-lays-out under the new parent
          posRef.current = next;
          savePos(next);
          onReparent(factoryId, newNet);
          return;
        }
      }
    }
    posRef.current = { ...posRef.current, [node.id]: { x: node.position.x, y: node.position.y } };
    savePos(posRef.current);
  }, [getIntersectingNodes, factoryNet, onReparent]);

  const resetLayout = useCallback(() => {
    posRef.current = {};
    savePos({});
    setNodes(layoutNodes.map((ln) => ({ ...ln })));
  }, [layoutNodes, setNodes]);

  if (!layoutNodes.length) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground">
        Nothing to map yet. Add a network or a factory, or relax the filters.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      colorMode={colorMode}
      fitView
      minZoom={0.15}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: false }}
      onNodeClick={(_, node) => {
        const id = node.id;
        if (id.startsWith("n_")) onOpen("network", id.slice(2));
        else if (id.startsWith("f_")) onOpen("factory", id.slice(2));
        else if (id.startsWith("c_")) onOpen("contact", id.slice(2));
      }}
    >
      <Panel position="top-right">
        <Button variant="outline" size="sm" onClick={resetLayout} className="h-8 px-3 rounded-full text-[11.5px] text-foreground/80 hover:text-foreground shadow-mo-elevated">
          Reset layout
        </Button>
      </Panel>
      <Background gap={22} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={(n) => miniColor((n.data as NodeData)?.kind)} />
    </ReactFlow>
  );
}

function miniColor(kind?: Kind): string {
  // The map distinguishes three kinds, and the system has one hue — so depth on
  // the primary ramp carries network vs contact, and the neutrals carry the rest.
  return kind === "network"
    ? "var(--mo-primary-500)"
    : kind === "factory"
      ? "var(--mo-neutral-400)"
      : kind === "contact"
        ? "var(--mo-primary-300)"
        : "var(--mo-neutral-500)";
}

function EntityNode({ data }: NodeProps) {
  const d = data as NodeData;
  const isRoot = d.kind === "root";
  const border =
    d.kind === "network" ? "border-l-primary" : d.kind === "contact" ? "border-l-[color:var(--mo-primary-800)]" : "border-l-border-strong";

  return (
    <div
      className={`relative rounded-lg border border-border bg-card shadow-mo-elevated px-3 py-2 min-w-[230px] max-w-[320px] cursor-grab active:cursor-grabbing hover:border-border-strong ${
        isRoot ? "border-dashed bg-muted/60" : `border-l-[3px] ${border}`
      }`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

      {d.alert && (
        <span title="Open alert" className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[color:var(--color-warn)] ring-2 ring-background" />
      )}

      {/* Row 1: kind (+ target) · status */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground">{d.kind}</span>
          {d.target && <span className="text-[8px] tabular-nums uppercase tracking-wider text-primary shrink-0">target</span>}
        </span>
        {d.stage && <span className="shrink-0"><StagePill stage={d.stage} /></span>}
      </div>

      {/* Row 2: full name (no truncation) · location */}
      <div className="flex items-start justify-between gap-2.5 mt-1">
        <div className="flex-1 min-w-0 text-[13px] font-medium text-foreground leading-snug break-words">{d.label}</div>
        {d.sub && (
          <div className="shrink-0 max-w-[44%] text-[10.5px] text-muted-foreground text-right leading-snug break-words">{d.sub}</div>
        )}
      </div>
    </div>
  );
}
