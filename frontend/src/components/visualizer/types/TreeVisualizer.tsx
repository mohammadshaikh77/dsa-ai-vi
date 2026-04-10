import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

interface TreeNode {
  id: number;
  val: number | string;
  left?: number | null;
  right?: number | null;
}

interface TreeState {
  nodes: TreeNode[];
  root: number;
  current?: number | null;
  target?: number | string | null;
  visited?: number[];
  queue?: number[];
  actionLog?: string[];
  operation?: string;
  comparison?: string;
  action?: string;
  iteration?: string | number;
  found?: boolean;
}

interface LayoutNode {
  id: number;
  val: number | string;
  x: number;
  y: number;
  left?: number | null;
  right?: number | null;
}

const SVG_W = 560;
const SVG_H = 320;
const NODE_R = 22;
const LEVEL_H = 72;
const PAD_TOP = 40;

function buildLayout(nodes: TreeNode[], root: number): Map<number, LayoutNode> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const positions = new Map<number, LayoutNode>();

  // Compute sub-tree size for proportional spacing
  function size(id: number | null | undefined): number {
    if (id == null) return 0;
    const n = nodeMap.get(id);
    if (!n) return 0;
    return 1 + size(n.left ?? null) + size(n.right ?? null);
  }

  function assign(
    id: number | null | undefined,
    depth: number,
    lo: number,
    hi: number
  ) {
    if (id == null) return;
    const n = nodeMap.get(id);
    if (!n) return;

    const leftSize = size(n.left ?? null);
    const totalSize = size(id);
    const fraction = totalSize > 1 ? (leftSize + 0.5) / totalSize : 0.5;
    const x = lo + (hi - lo) * fraction;
    const y = PAD_TOP + depth * LEVEL_H;

    positions.set(id, { id, val: n.val, x, y, left: n.left, right: n.right });
    assign(n.left ?? null, depth + 1, lo, x);
    assign(n.right ?? null, depth + 1, x, hi);
  }

  assign(root, 0, 0, SVG_W);
  return positions;
}

function getNodeColor(
  id: number,
  current: number | null | undefined,
  visited: number[],
  target: number | string | null | undefined,
  nodes: TreeNode[],
  found: boolean
): {
  fill: string;
  stroke: string;
  textColor: string;
  glow?: string;
} {
  const node = nodes.find((n) => n.id === id);
  const isCurrent = id === current;
  const isVisited = visited.includes(id);
  const isTarget = target != null && node && String(node.val) === String(target);

  if (isCurrent && isTarget && found) {
    return {
      fill: "#fbbf24",
      stroke: "#f59e0b",
      textColor: "#1a1000",
      glow: "drop-shadow(0 0 12px #fbbf24)",
    };
  }
  if (isCurrent) {
    return {
      fill: "#1e3a5f",
      stroke: "#3b82f6",
      textColor: "#93c5fd",
      glow: "drop-shadow(0 0 14px rgba(59,130,246,0.9))",
    };
  }
  if (isTarget) {
    return {
      fill: "#422006",
      stroke: "#fbbf24",
      textColor: "#fbbf24",
      glow: "drop-shadow(0 0 8px rgba(251,191,36,0.6))",
    };
  }
  if (isVisited) {
    return {
      fill: "#052e16",
      stroke: "#22c55e",
      textColor: "#86efac",
    };
  }
  return {
    fill: "#0f172a",
    stroke: "#334155",
    textColor: "#94a3b8",
  };
}

export function TreeVisualizer({ step }: { step: VisualizationStep }) {
  const state = (step.state || {}) as TreeState;
  const {
    nodes = [],
    root = 0,
    current = null,
    target = null,
    visited = [],
    queue = [],
    actionLog = [],
    operation = "",
    comparison = "",
    action = "",
    iteration = "",
    found = false,
  } = state;

  const layout = useMemo(() => buildLayout(nodes, root), [nodes, root]);

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40 font-mono text-sm">
        No tree data
      </div>
    );
  }

  // Collect all edges
  const edges: { from: LayoutNode; to: LayoutNode; side: "left" | "right" }[] = [];
  layout.forEach((node) => {
    if (node.left != null) {
      const child = layout.get(node.left);
      if (child) edges.push({ from: node, to: child, side: "left" });
    }
    if (node.right != null) {
      const child = layout.get(node.right);
      if (child) edges.push({ from: node, to: child, side: "right" });
    }
  });

  const layoutArr = Array.from(layout.values());

  // Target label display
  const targetLabel = target != null ? String(target) : null;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-3">
      {/* PANEL A — Binary Tree */}
      <div className="flex-1 rounded-xl border border-blue-900/60 bg-[#050e1f] overflow-hidden">
        <div className="px-3 py-2 border-b border-blue-900/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">
            (A) Binary Tree
          </span>
          {targetLabel && (
            <span className="text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full">
              Target: {targetLabel}
            </span>
          )}
        </div>

        <div className="p-2 overflow-x-auto">
          <svg
            width="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="block"
            style={{ minWidth: 240 }}
          >
            {/* Edges */}
            {edges.map(({ from, to }, i) => {
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const toX = from.x + (dx / len) * (len - NODE_R);
              const toY = from.y + (dy / len) * (len - NODE_R);
              const fromX = from.x + (dx / len) * NODE_R;
              const fromY = from.y + (dy / len) * NODE_R;

              const isActive =
                (from.id === current && (to.id === from.left || to.id === from.right)) ||
                visited.includes(from.id) && visited.includes(to.id);

              return (
                <motion.line
                  key={i}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={isActive ? "#3b82f6" : "#1e293b"}
                  strokeWidth={isActive ? 2 : 1.5}
                  strokeOpacity={isActive ? 1 : 0.7}
                  markerEnd="url(#arrow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                />
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" fillOpacity={0.7} />
              </marker>
            </defs>

            {/* Nodes */}
            {layoutArr.map((node) => {
              const colors = getNodeColor(
                node.id,
                current,
                visited,
                target,
                nodes,
                found
              );
              const isCurrent = node.id === current;

              return (
                <g key={node.id} style={{ filter: colors.glow }}>
                  {isCurrent && (
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={NODE_R + 6}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeOpacity={0.4}
                      animate={{ r: [NODE_R + 5, NODE_R + 10, NODE_R + 5] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  )}
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_R}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={colors.textColor}
                    fontSize={14}
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {node.val}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col gap-3 lg:w-56 shrink-0">
        {/* PANEL B — Current State */}
        <div className="rounded-xl border border-emerald-900/50 bg-[#031a0e] overflow-hidden">
          <div className="px-3 py-2 border-b border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">
              (B) Current State
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2.5">
            {current != null && (() => {
              const cn = nodes.find((n) => n.id === current);
              return cn ? (
                <div className="bg-emerald-900/40 border border-emerald-700/40 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-emerald-300">
                  current = {cn.val}
                </div>
              ) : null;
            })()}

            {comparison && (
              <div className="text-sm text-white/70 font-mono px-1">{comparison}</div>
            )}

            {action && (
              <div className="bg-black/30 rounded-lg border border-white/5 px-3 py-2 text-sm text-white/80">
                {action}
              </div>
            )}

            {iteration != null && iteration !== "" && (
              <div className="text-xs text-white/30 px-1 font-mono">
                {iteration}
              </div>
            )}

            {queue.length > 0 && (
              <div className="mt-1">
                <div className="text-xs text-blue-400/70 font-semibold mb-1 uppercase tracking-wider">Queue</div>
                <div className="flex flex-wrap gap-1">
                  {queue.map((qid) => {
                    const qn = nodes.find((n) => n.id === qid);
                    return qn ? (
                      <span
                        key={qid}
                        className="text-xs font-mono bg-blue-900/40 border border-blue-700/30 text-blue-300 rounded px-2 py-0.5"
                      >
                        {qn.val}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {operation && (
              <div className="mt-auto pt-1">
                <span className="text-xs uppercase tracking-widest font-semibold text-purple-400/70">
                  {operation}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PANEL C — Action Log */}
        <div className="rounded-xl border border-amber-900/50 bg-[#1a0e00] overflow-hidden flex-1">
          <div className="px-3 py-2 border-b border-amber-900/40">
            <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">
              (C) Action Log
            </span>
          </div>
          <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-48">
            {actionLog.length === 0 ? (
              <div className="text-xs text-white/20 italic">No steps yet</div>
            ) : (
              <AnimatePresence>
                {actionLog.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-xs text-white/75 leading-snug">{entry}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
