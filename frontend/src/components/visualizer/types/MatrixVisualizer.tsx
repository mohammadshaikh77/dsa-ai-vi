import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

type CellCoord = [number, number];

interface MatrixState {
  grid: (number | string)[][];
  rows?: number;
  cols?: number;
  current?: CellCoord | null;
  visited?: CellCoord[];
  path?: CellCoord[];
  queue?: CellCoord[];
  actionLog?: string[];
  stepPreview?: string[];
  operation?: string;
  position?: string;
  action?: string;
  direction?: string;
  visitedCount?: number;
  islandCount?: number;
  found?: boolean;
}

function coordKey(c: CellCoord) {
  return `${c[0]},${c[1]}`;
}

function coordsMatch(a: CellCoord, b: CellCoord) {
  return a[0] === b[0] && a[1] === b[1];
}

function inList(list: CellCoord[], r: number, c: number) {
  return list.some(([lr, lc]) => lr === r && lc === c);
}

type CellState = "current" | "path" | "visited" | "queued" | "blocked" | "normal";

function getCellState(
  r: number,
  c: number,
  current: CellCoord | null | undefined,
  visited: CellCoord[],
  path: CellCoord[],
  queue: CellCoord[],
  grid: (number | string)[][]
): CellState {
  if (current && coordsMatch(current, [r, c])) return "current";
  if (inList(path, r, c)) return "path";
  if (inList(visited, r, c)) return "visited";
  if (inList(queue, r, c)) return "queued";
  const val = grid[r]?.[c];
  if (val === 0 || val === "0" || val === "#" || val === "W") return "blocked";
  return "normal";
}

const CELL_STYLES: Record<CellState, string> = {
  current:
    "bg-orange-500/90 border-orange-400 text-white shadow-[0_0_16px_rgba(249,115,22,0.8)] scale-105 z-10",
  path: "bg-emerald-500/80 border-emerald-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]",
  visited: "bg-teal-800/60 border-teal-600/50 text-teal-300",
  queued: "bg-blue-700/60 border-blue-500/60 text-blue-200",
  blocked: "bg-slate-900/80 border-slate-700/40 text-slate-600",
  normal: "bg-slate-800/50 border-slate-600/40 text-slate-300",
};

const PREVIEW_COLORS = ["bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
  "bg-blue-500/20 border-blue-500/40 text-blue-400",
  "bg-amber-500/20 border-amber-500/40 text-amber-400"];

const DIR_ARROWS: Record<string, string> = {
  up: "↑", down: "↓", left: "←", right: "→",
  "up-left": "↖", "up-right": "↗", "down-left": "↙", "down-right": "↘",
};

export function MatrixVisualizer({ step }: { step: VisualizationStep }) {
  const state = (step.state || {}) as MatrixState;
  const {
    grid = [],
    current = null,
    visited = [],
    path = [],
    queue = [],
    actionLog = [],
    stepPreview = [],
    operation = "",
    position,
    action = "",
    direction = "",
    visitedCount,
    islandCount,
  } = state;

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  // Compute cell size dynamically based on grid size
  const cellSize = useMemo(() => {
    if (cols <= 4) return "w-14 h-14 text-base";
    if (cols <= 6) return "w-11 h-11 text-sm";
    if (cols <= 8) return "w-9 h-9 text-xs";
    return "w-7 h-7 text-xs";
  }, [cols]);

  const posLabel = position ?? (current ? `(${current[0]}, ${current[1]})` : "—");
  const visCount = visitedCount ?? visited.length;

  if (!rows || !cols) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 font-mono text-sm">
        No grid data
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-3">
      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-3 flex-1">
        {/* PANEL A — Grid */}
        <div className="rounded-xl border border-blue-900/50 bg-[#050e1f] overflow-hidden">
          <div className="px-3 py-2 border-b border-blue-900/40">
            <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">
              (A) Grid Visualization
            </span>
          </div>
          <div className="p-4 overflow-x-auto">
            <div
              className="flex flex-col gap-1.5 items-center"
              style={{ minWidth: cols * 40 }}
            >
              {grid.map((row, rIdx) => (
                <div key={rIdx} className="flex gap-1.5">
                  {row.map((cell, cIdx) => {
                    const cs = getCellState(
                      rIdx,
                      cIdx,
                      current,
                      visited,
                      path,
                      queue,
                      grid
                    );
                    return (
                      <motion.div
                        key={`${rIdx}-${cIdx}`}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: cs === "current" ? 1.05 : 1 }}
                        transition={{ duration: 0.25, delay: (rIdx * cols + cIdx) * 0.01 }}
                        className={`
                          flex items-center justify-center rounded-lg border font-mono font-bold
                          transition-all duration-300 relative select-none
                          ${cellSize} ${CELL_STYLES[cs]}
                        `}
                      >
                        {cs === "current" && (
                          <motion.div
                            className="absolute inset-0 rounded-lg border-2 border-orange-400"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                        {cell}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
              {[
                { label: "Current", cls: "bg-orange-500" },
                { label: "Visited", cls: "bg-teal-700" },
                { label: "Path", cls: "bg-emerald-500" },
                { label: "Queue", cls: "bg-blue-600" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-sm ${cls}`} />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL C — Action Log */}
        <div className="rounded-xl border border-red-900/50 bg-[#1a0505] overflow-hidden flex-1">
          <div className="px-3 py-2 border-b border-red-900/40">
            <span className="text-xs font-semibold text-red-400 tracking-widest uppercase">
              (C) Action Log
            </span>
          </div>
          <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-40">
            {actionLog.length === 0 ? (
              <div className="text-xs text-white/20 italic">No steps yet</div>
            ) : (
              <AnimatePresence>
                {actionLog.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="flex items-start gap-2"
                  >
                    <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

      {/* RIGHT COLUMN */}
      <div className="flex flex-col gap-3 lg:w-56 shrink-0">
        {/* PANEL B — Current State */}
        <div className="rounded-xl border border-emerald-900/50 bg-[#031a0e] overflow-hidden">
          <div className="px-3 py-2 border-b border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">
              (B) Current State
            </span>
          </div>
          <div className="p-3 flex flex-col gap-3">
            <div className="bg-emerald-900/40 border border-emerald-700/40 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-emerald-300 text-center">
              Position: {posLabel}
            </div>

            <div className="text-xs text-white/50 text-center">
              Visited: {visCount} cell{visCount !== 1 ? "s" : ""}
              {islandCount != null && (
                <span className="ml-2 text-amber-400">Islands: {islandCount}</span>
              )}
            </div>

            {/* Mini direction compass */}
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-3 gap-0.5 w-20">
                {[
                  ["↖", false], ["↑", true], ["↗", false],
                  ["←", true],  ["·", false], ["→", true],
                  ["↙", false], ["↓", true],  ["↘", false],
                ].map(([arrow, active], i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-center w-6 h-6 rounded text-xs font-mono
                      ${active
                        ? "bg-emerald-700/60 border border-emerald-600/50 text-emerald-300"
                        : "bg-slate-800/40 border border-slate-700/20 text-slate-600"
                      }`}
                  >
                    {arrow}
                  </div>
                ))}
              </div>
            </div>

            {direction && (
              <div className="text-xs text-white/40 text-center">{direction}</div>
            )}

            {action && (
              <div className="bg-black/30 rounded-lg border border-white/5 px-3 py-2 text-xs text-white/70 leading-snug">
                {action}
              </div>
            )}

            {operation && (
              <div className="text-xs uppercase tracking-widest font-semibold text-purple-400/60 text-center">
                {operation}
              </div>
            )}
          </div>
        </div>

        {/* PANEL D — Step Preview */}
        <div className="rounded-xl border border-amber-900/50 bg-[#1a0e00] overflow-hidden flex-1">
          <div className="px-3 py-2 border-b border-amber-900/40">
            <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">
              (D) Step Preview
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {stepPreview.length === 0 ? (
              <div className="text-xs text-white/20 italic">No upcoming steps</div>
            ) : (
              stepPreview.slice(0, 4).map((preview, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.22 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className={`shrink-0 w-5 h-5 rounded border text-xs flex items-center justify-center mt-0.5 ${
                      PREVIEW_COLORS[i % PREVIEW_COLORS.length]
                    }`}
                  >
                    {["↓", "→", "↩"][i % 3]}
                  </span>
                  <span className="text-xs text-white/70 leading-snug">{preview}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
