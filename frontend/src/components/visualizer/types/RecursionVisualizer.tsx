import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeStatus = "active" | "returning" | "visited" | "result" | "pending";
type EdgeType = "pick" | "skip" | "backtrack" | "default";

interface RecTreeNode {
  id: number;
  label: string;
  parent: number | null;
  depth?: number;
  status?: NodeStatus;
  edgeType?: EdgeType;
  edgeLabel?: string;
}

interface CallFrame {
  call: string;
  status: "done" | "active" | "returning" | "pending";
}

interface RecursionState {
  treeNodes: RecTreeNode[];
  callStack: CallFrame[];
  activeNodeId?: number | null;
  currentIndex?: number | string | null;
  currentTemp?: string | null;
  decision?: string | null;
  problemLabel?: string | null;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const SVG_W = 580;
const LEVEL_H = 74;
const NODE_R = 22;
const PAD_TOP = 36;

interface Pos { x: number; y: number }

function buildLayout(nodes: RecTreeNode[]): Map<number, Pos> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<number | null, number[]>();

  // Build children map (including null for root detection)
  nodes.forEach((n) => {
    const key = n.parent ?? null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(n.id);
  });

  // Find root — either explicitly parent=null, or first node
  const roots = nodes.filter((n) => n.parent === null);
  const rootId = roots[0]?.id ?? nodes[0]?.id;
  if (rootId === undefined) return new Map();

  // Compute sub-tree size for proportional x spacing
  function subtreeSize(id: number): number {
    const kids = children.get(id) ?? [];
    if (!kids.length) return 1;
    return kids.reduce((s, c) => s + subtreeSize(c), 0);
  }

  const positions = new Map<number, Pos>();

  function assign(id: number, depth: number, lo: number, hi: number) {
    const mid = (lo + hi) / 2;
    positions.set(id, { x: mid, y: PAD_TOP + depth * LEVEL_H });
    const kids = children.get(id) ?? [];
    const total = hi - lo;
    let cursor = lo;
    kids.forEach((kid) => {
      const frac = subtreeSize(kid) / subtreeSize(id);
      assign(kid, depth + 1, cursor, cursor + total * frac);
      cursor += total * frac;
    });
  }

  assign(rootId, 0, 0, SVG_W);
  return positions;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function nodeStyle(status: NodeStatus | undefined) {
  switch (status) {
    case "active":
      return {
        fill: "#451a03",
        stroke: "#f59e0b",
        text: "#fbbf24",
        glow: "drop-shadow(0 0 14px rgba(245,158,11,0.9))",
      };
    case "returning":
      return {
        fill: "#2d0a0a",
        stroke: "#ef4444",
        text: "#fca5a5",
        glow: "drop-shadow(0 0 8px rgba(239,68,68,0.6))",
      };
    case "visited":
      return {
        fill: "#052e16",
        stroke: "#22c55e",
        text: "#86efac",
        glow: undefined,
      };
    case "result":
      return {
        fill: "#422006",
        stroke: "#fbbf24",
        text: "#fef08a",
        glow: "drop-shadow(0 0 16px rgba(251,191,36,0.9))",
      };
    default:
      return {
        fill: "#0f172a",
        stroke: "#334155",
        text: "#64748b",
        glow: undefined,
      };
  }
}

function edgeColor(type: EdgeType | undefined) {
  switch (type) {
    case "pick":    return "#22c55e";
    case "skip":    return "#ef4444";
    case "backtrack": return "#f97316";
    default:        return "#1e3a5f";
  }
}

const FRAME_COLORS: Record<CallFrame["status"], string> = {
  done:      "border-slate-700/40 text-slate-500",
  active:    "border-blue-500/70 bg-blue-900/20 text-blue-200",
  returning: "border-amber-500/40 bg-amber-900/10 text-amber-300",
  pending:   "border-slate-800/40 text-slate-600",
};

const DOT_COLORS: Record<CallFrame["status"], string> = {
  done:      "bg-slate-600",
  active:    "bg-blue-400",
  returning: "bg-amber-400",
  pending:   "bg-slate-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RecursionVisualizer({ step }: { step: VisualizationStep }) {
  const state = (step.state || {}) as RecursionState;
  const {
    treeNodes = [],
    callStack = [],
    activeNodeId = null,
    currentIndex = null,
    currentTemp = null,
    decision = null,
    problemLabel = null,
  } = state;

  const layout = useMemo(() => buildLayout(treeNodes), [treeNodes]);
  const maxDepth = useMemo(
    () => treeNodes.reduce((m, n) => Math.max(m, n.depth ?? 0), 0),
    [treeNodes]
  );
  const svgH = PAD_TOP + (maxDepth + 1) * LEVEL_H + NODE_R + 16;

  if (!treeNodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 font-mono text-sm">
        No recursion tree data
      </div>
    );
  }

  // Build edges from parent pointers
  const edges = treeNodes
    .filter((n) => n.parent !== null && n.parent !== undefined)
    .map((n) => {
      const from = layout.get(n.parent!);
      const to = layout.get(n.id);
      if (!from || !to) return null;
      return { from, to, node: n };
    })
    .filter(Boolean) as { from: Pos; to: Pos; node: RecTreeNode }[];

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top two panels */}
      <div className="flex gap-3">
        {/* PANEL: Recursion Tree */}
        <div className="flex-1 rounded-xl border border-blue-900/50 bg-[#050e1f] overflow-hidden">
          <div className="px-3 py-2 border-b border-blue-900/40 flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">
              Recursion Tree
            </span>
            {problemLabel && (
              <span className="text-xs text-white/40 font-mono">
                — {problemLabel}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <svg
              width="100%"
              viewBox={`0 0 ${SVG_W} ${svgH}`}
              style={{ minWidth: 300, display: "block" }}
            >
              <defs>
                {(["pick", "skip", "backtrack", "default"] as EdgeType[]).map((t) => (
                  <marker
                    key={t}
                    id={`arr-${t}`}
                    markerWidth="7"
                    markerHeight="7"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L7,3 z" fill={edgeColor(t)} fillOpacity={0.8} />
                  </marker>
                ))}
              </defs>

              {/* Edges */}
              {edges.map(({ from, to, node }, i) => {
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const fx = from.x + (dx / len) * NODE_R;
                const fy = from.y + (dy / len) * NODE_R;
                const tx = to.x - (dx / len) * NODE_R;
                const ty = to.y - (dy / len) * NODE_R;
                const color = edgeColor(node.edgeType);
                const isActive = node.id === activeNodeId || node.status === "active";

                return (
                  <g key={i}>
                    <motion.line
                      x1={fx} y1={fy} x2={tx} y2={ty}
                      stroke={color}
                      strokeWidth={isActive ? 2 : 1.5}
                      strokeOpacity={node.status === "pending" ? 0.2 : 0.7}
                      markerEnd={`url(#arr-${node.edgeType ?? "default"})`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    {node.edgeLabel && (
                      <text
                        x={(fx + tx) / 2 + (dx > 0 ? 8 : -8)}
                        y={(fy + ty) / 2 - 4}
                        fontSize={9}
                        fill={color}
                        fillOpacity={0.8}
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {node.edgeLabel}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {treeNodes.map((node) => {
                const pos = layout.get(node.id);
                if (!pos) return null;
                const colors = nodeStyle(node.status);
                const isActive = node.id === activeNodeId || node.status === "active";

                return (
                  <g key={node.id} style={{ filter: colors.glow }}>
                    {isActive && (
                      <motion.circle
                        cx={pos.x} cy={pos.y} r={NODE_R + 6}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeOpacity={0.4}
                        animate={{ r: [NODE_R + 5, NODE_R + 11, NODE_R + 5] }}
                        transition={{ duration: 1.3, repeat: Infinity }}
                      />
                    )}
                    <motion.circle
                      cx={pos.x} cy={pos.y} r={NODE_R}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 280, damping: 22 }}
                    />
                    <text
                      x={pos.x} y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={colors.text}
                      fontSize={node.label.length > 5 ? 8 : node.label.length > 3 ? 10 : 12}
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* PANEL: Call Stack */}
        <div className="w-52 shrink-0 rounded-xl border border-slate-700/40 bg-[#070d1a] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/30">
            <span className="text-xs font-semibold text-slate-300 tracking-widest uppercase">
              Call Stack
            </span>
          </div>
          <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-72">
            {callStack.length === 0 ? (
              <div className="text-xs text-white/20 italic p-1">Empty</div>
            ) : (
              <AnimatePresence>
                {callStack.map((frame, i) => (
                  <motion.div
                    key={frame.call}
                    initial={{ opacity: 0, x: 14, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: -14, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`
                      flex items-center gap-2 px-2.5 py-2 rounded-lg border
                      ${FRAME_COLORS[frame.status]}
                      ${frame.status === "active" ? "ring-1 ring-blue-500/30" : ""}
                    `}
                  >
                    {frame.status === "active" && (
                      <svg className="w-3 h-3 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    )}
                    {frame.status !== "active" && (
                      <span className={`shrink-0 w-2 h-2 rounded-full ${DOT_COLORS[frame.status]}`} />
                    )}
                    <span className="text-xs font-mono leading-snug flex-1 min-w-0 truncate">
                      {frame.call}
                    </span>
                    {frame.status === "returning" && (
                      <span className="text-[9px] font-bold text-amber-400 whitespace-nowrap uppercase tracking-wide">
                        RET
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* PANEL: Current State bar */}
      <div className="rounded-xl border border-slate-700/30 bg-[#070d1a] px-4 py-3 flex flex-wrap gap-4 items-center">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Current State
        </span>
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {currentIndex !== null && currentIndex !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 font-mono">index</span>
              <span className="text-sm font-mono font-bold text-white/80">= {currentIndex}</span>
            </div>
          )}
          {currentTemp !== null && currentTemp !== undefined && (
            <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-lg px-3 py-1">
              <span className="text-xs text-white/40 font-mono">temp</span>
              <span className="text-sm font-mono font-bold text-emerald-300">= {currentTemp}</span>
            </div>
          )}
          {decision && (
            <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-1">
              <span className="text-xs text-white/40">Decision:</span>
              <span className="text-sm font-mono font-bold text-amber-300">{decision}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
