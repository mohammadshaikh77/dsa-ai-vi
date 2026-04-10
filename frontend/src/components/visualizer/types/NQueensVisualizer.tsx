import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

interface QueenPos { row: number; col: number }

interface NQueensState {
  board?: number[][];
  n?: number;
  currentRow?: number;
  placingCol?: number | null;
  queens?: QueenPos[];
  attacked?: [number, number][];
  safe?: [number, number][];
  action?: string;
  decision?: string;
  isBacktracking?: boolean;
  solutionsFound?: number;
  actionLog?: string[];
}

// ─── Compute attacked cells from placed queens ────────────────────────────────
function computeAttacked(queens: QueenPos[], n: number): Set<string> {
  const set = new Set<string>();
  for (const q of queens) {
    for (let c = 0; c < n; c++) {
      set.add(`${q.row},${c}`);      // full row
    }
    for (let r = 0; r < n; r++) {
      set.add(`${r},${q.col}`);      // full col
    }
    for (let d = -(n - 1); d < n; d++) {
      const r1 = q.row + d; const c1 = q.col + d;
      const r2 = q.row + d; const c2 = q.col - d;
      if (r1 >= 0 && r1 < n && c1 >= 0 && c1 < n) set.add(`${r1},${c1}`);
      if (r2 >= 0 && r2 < n && c2 >= 0 && c2 < n) set.add(`${r2},${c2}`);
    }
  }
  return set;
}

// ─── Cell type helper ─────────────────────────────────────────────────────────
type CellRole = "queen" | "attacked" | "trying" | "current-row" | "safe" | "normal";

function getCellRole(
  r: number,
  c: number,
  queens: QueenPos[],
  attackedSet: Set<string>,
  currentRow: number,
  placingCol: number | null | undefined,
  isBacktracking: boolean
): CellRole {
  if (queens.some((q) => q.row === r && q.col === c)) return "queen";
  if (placingCol != null && r === currentRow && c === placingCol) {
    return isBacktracking ? "attacked" : "trying";
  }
  if (attackedSet.has(`${r},${c}`) && r === currentRow) return "attacked";
  if (r === currentRow && !attackedSet.has(`${r},${c}`)) return "safe";
  if (r === currentRow) return "current-row";
  return "normal";
}

const CELL_STYLES: Record<CellRole, { bg: string; border: string; text: string }> = {
  queen:       { bg: "bg-amber-400",        border: "border-amber-300",    text: "text-[#1a0a00]" },
  attacked:    { bg: "bg-red-900/60",        border: "border-red-500/60",   text: "text-red-300" },
  trying:      { bg: "bg-blue-800/70",       border: "border-blue-400",     text: "text-blue-200" },
  "current-row":{ bg: "bg-blue-900/30",     border: "border-blue-600/40",  text: "text-blue-200" },
  safe:        { bg: "bg-emerald-900/40",    border: "border-emerald-500/40", text: "text-emerald-300" },
  normal:      { bg: "",                     border: "border-transparent",  text: "" },
};

// ─── Queen SVG glyph ──────────────────────────────────────────────────────────
function QueenGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 19h14l1-9-4 3-4-8-4 8-4-3z" />
      <rect x="4" y="20" width="16" height="2" rx="1" />
      <circle cx="4" cy="7" r="1.5" />
      <circle cx="20" cy="7" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NQueensVisualizer({ step }: { step: VisualizationStep }) {
  const raw = (step.state || {}) as NQueensState;

  // Derive n from board or queens array
  const n = raw.n ?? raw.board?.length ?? (raw.queens?.length ? Math.max(...raw.queens.map(q => Math.max(q.row, q.col))) + 2 : 4);
  const queens: QueenPos[] = raw.queens ?? [];
  const currentRow = raw.currentRow ?? 0;
  const placingCol = raw.placingCol ?? null;
  const isBacktracking = raw.isBacktracking ?? false;
  const action = raw.action ?? step.description ?? "";
  const decision = raw.decision ?? "";
  const solutionsFound = raw.solutionsFound ?? 0;
  const actionLog = raw.actionLog ?? [];

  const attackedSet = useMemo(() => computeAttacked(queens, n), [queens, n]);

  const cellSize = n <= 6 ? 64 : n <= 8 ? 52 : 42;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top row: board + state panel */}
      <div className="flex gap-3 items-start">

        {/* BOARD */}
        <div className="rounded-xl border border-blue-900/50 bg-[#050e1f] overflow-hidden">
          <div className="px-3 py-2 border-b border-blue-900/40 flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">Board</span>
            <span className="text-xs text-white/40 font-mono">{n} × {n}</span>
            {isBacktracking && (
              <span className="ml-auto text-xs font-bold text-amber-400 uppercase tracking-wide animate-pulse">
                Backtracking
              </span>
            )}
          </div>
          <div className="p-3">
            {/* Column headers */}
            <div className="flex mb-1" style={{ paddingLeft: 24 }}>
              {Array.from({ length: n }, (_, c) => (
                <div
                  key={c}
                  className="text-center text-[10px] font-mono text-white/30"
                  style={{ width: cellSize, height: 16 }}
                >
                  {c}
                </div>
              ))}
            </div>
            {Array.from({ length: n }, (_, r) => (
              <div key={r} className="flex items-center">
                {/* Row label */}
                <div
                  className={`text-[10px] font-mono text-right pr-1.5 shrink-0 ${r === currentRow ? "text-blue-400 font-bold" : "text-white/30"}`}
                  style={{ width: 22 }}
                >
                  {r}
                </div>
                {Array.from({ length: n }, (_, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const role = getCellRole(r, c, queens, attackedSet, currentRow, placingCol, isBacktracking);
                  const styles = CELL_STYLES[role];
                  const isQueenCell = role === "queen";
                  const isTrying = role === "trying";

                  return (
                    <motion.div
                      key={c}
                      layout
                      className={`
                        relative flex items-center justify-center rounded-sm border
                        ${isLight ? "bg-slate-700/30" : "bg-slate-900/60"}
                        ${styles.bg} ${styles.border} ${styles.text}
                        transition-colors duration-200
                      `}
                      style={{ width: cellSize, height: cellSize, margin: 1.5 }}
                      animate={isQueenCell ? { scale: [1, 1.12, 1] } : isTrying ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      {isQueenCell && (
                        <motion.div
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="flex items-center justify-center"
                          style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.8))" }}
                        >
                          <QueenGlyph size={cellSize * 0.54} />
                        </motion.div>
                      )}
                      {isTrying && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2.5 h-2.5 rounded-full bg-blue-400"
                        />
                      )}
                      {role === "safe" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                      )}
                      {role === "attacked" && r === currentRow && (
                        <div className="text-red-400/60" style={{ fontSize: cellSize * 0.28 }}>✕</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: state + legend */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* State card */}
          <div className="rounded-xl border border-slate-700/40 bg-[#070d1a] p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Current State</div>
            <div className="flex flex-col gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-20 shrink-0">Row</span>
                <span className="text-blue-300 font-bold">{currentRow}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-20 shrink-0">Queens</span>
                <span className="text-amber-300 font-bold">{queens.length} placed</span>
              </div>
              {solutionsFound > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-white/40 w-20 shrink-0">Solutions</span>
                  <span className="text-emerald-300 font-bold">{solutionsFound} found</span>
                </div>
              )}
              {placingCol != null && (
                <div className="flex items-center gap-2">
                  <span className="text-white/40 w-20 shrink-0">Trying col</span>
                  <span className="text-blue-200 font-bold">{placingCol}</span>
                </div>
              )}
              {queens.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-white/40 w-20 shrink-0 self-start">Placed</span>
                  <div className="flex flex-wrap gap-1">
                    {queens.map((q, i) => (
                      <span key={i} className="bg-amber-900/40 border border-amber-500/30 rounded px-1.5 py-0.5 text-amber-200">
                        ({q.row},{q.col})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action card */}
          {(action || decision) && (
            <div className="rounded-xl border border-blue-700/30 bg-blue-950/20 p-3">
              {action && (
                <div className="text-xs text-white/70 leading-relaxed mb-1">{action}</div>
              )}
              {decision && (
                <div className={`text-xs font-bold leading-relaxed ${isBacktracking ? "text-amber-300" : "text-emerald-300"}`}>
                  {decision}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="rounded-xl border border-slate-800/40 bg-[#070d1a] p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Legend</div>
            <div className="flex flex-col gap-1.5">
              {[
                { color: "bg-amber-400",       label: "Queen placed" },
                { color: "bg-blue-700/70",     label: "Trying this column" },
                { color: "bg-emerald-900/60",  label: "Safe cell (current row)" },
                { color: "bg-red-900/60",      label: "Attacked (current row)" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${color} border border-white/10`} />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action log */}
      {actionLog.length > 0 && (
        <div className="rounded-xl border border-slate-700/30 bg-[#070d1a] p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Action Log</div>
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
            <AnimatePresence>
              {actionLog.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className={`flex items-start gap-2 text-xs font-mono ${i === actionLog.length - 1 ? "text-blue-300" : "text-white/40"}`}
                >
                  <span className="text-white/20 shrink-0">{i + 1}.</span>
                  <span>{entry}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
