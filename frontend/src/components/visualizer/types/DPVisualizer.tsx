import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DPState {
  dpType?: "1d" | "2d";
  // 1D
  dp?: (number | null)[];
  currentIndex?: number | null;
  dependencies?: number[];
  // 2D
  dpTable?: (number | null)[][];
  rows?: number;
  cols?: number;
  currentCell?: [number, number] | null;
  dependencies2d?: [number, number][];
  rowChars?: string[];
  colChars?: string[];
  // Both
  computedValue?: number | null;
  formula?: string | null;
  inputArray?: (number | string)[];
  target?: number | string | null;
  decision?: string | null;
  actionLog?: string[];
}

// ─── 1D constants ─────────────────────────────────────────────────────────────

const CELL_W  = 56; // px width of each dp cell
const CELL_G  = 8;  // px gap between cells
const CELL_ST = CELL_W + CELL_G; // step = 64

/** X-center of cell at index i */
function cx(i: number) { return i * CELL_ST + CELL_W / 2; }

// ─── 1D View ──────────────────────────────────────────────────────────────────

function DP1DView({ state }: { state: DPState }) {
  const dp    = state.dp   ?? [];
  const curr  = state.currentIndex ?? null;
  const deps  = state.dependencies ?? [];
  const input = state.inputArray   ?? [];
  const target = state.target ?? null;

  // Dynamic arc height: tall enough that the bezier control point stays >= 8px
  // cpY = arcH - 10 - span * 0.25 >= 8  →  arcH >= span * 0.25 + 18
  const maxSpan = (deps.length > 0 && curr !== null)
    ? Math.max(...deps.map(d => Math.abs(cx(d) - cx(curr))))
    : CELL_ST;
  const arcH = Math.min(100, Math.max(44, maxSpan * 0.25 + 22));

  const svgW = Math.max(dp.length * CELL_ST, 100);

  return (
    <div className="w-full flex flex-col gap-4">

      {/* Input array + target badge */}
      {(input.length > 0 || target !== null) && (
        <div className="flex items-start gap-4 flex-wrap">
          {input.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Input</span>
              <div className="flex flex-wrap gap-2 pb-4">
                {input.map((v, i) => (
                  <div
                    key={i}
                    className={`relative flex items-center justify-center rounded-lg border font-mono font-bold text-sm
                      ${curr !== null && i === curr
                        ? "w-11 h-11 bg-amber-900/50 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        : "w-10 h-10 bg-[#0b1628] border-slate-700/50 text-white/60"
                      }`}
                  >
                    {v}
                    <span className="absolute -bottom-4 text-[9px] text-white/25 tabular-nums">{i}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {target !== null && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Target</span>
              <div className="flex items-center justify-center w-14 h-10 rounded-lg border-2 border-amber-500/60 bg-amber-900/25 font-mono font-bold text-amber-200">
                {target}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DP array with dependency arcs */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">DP Array</span>
        <div className="overflow-x-auto">

          {/* SVG arcs — sit ABOVE the cells, arcs end at cell tops */}
          {deps.length > 0 && curr !== null && (
            <svg
              width={svgW}
              height={arcH}
              style={{ display: "block", overflow: "visible" }}
            >
              <defs>
                <marker id="dp-arr-b" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0.5 L0,6.5 L7,3.5 z" fill="#60a5fa" fillOpacity="0.85" />
                </marker>
                <marker id="dp-arr-p" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0.5 L0,6.5 L7,3.5 z" fill="#a78bfa" fillOpacity="0.85" />
                </marker>
              </defs>
              {deps.map((depIdx, di) => {
                if (depIdx === curr) return null;
                const x1   = cx(depIdx);
                const x2   = cx(curr!);
                const midX = (x1 + x2) / 2;
                const span = Math.abs(x2 - x1);
                // cpY stays >= 8 due to dynamic arcH above
                const cpY  = Math.max(8, arcH - 10 - span * 0.25);
                const d    = `M ${x1} ${arcH} Q ${midX} ${cpY} ${x2} ${arcH}`;
                const isBlue = di % 2 === 0;
                return (
                  <motion.path
                    key={`arc-${depIdx}`}
                    d={d}
                    stroke={isBlue ? "#60a5fa" : "#a78bfa"}
                    strokeWidth={1.8}
                    fill="none"
                    markerEnd={`url(#${isBlue ? "dp-arr-b" : "dp-arr-p"})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    transition={{ duration: 0.32, delay: di * 0.1, ease: "easeOut" }}
                  />
                );
              })}
            </svg>
          )}

          {/* Cells */}
          <div className="flex gap-2">
            {dp.map((val, i) => {
              const isCurr = i === curr;
              const isDep  = deps.includes(i);
              const isComp = val !== null && !isCurr && !isDep;

              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <motion.div
                    animate={isCurr ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                    transition={isCurr ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                    className={`relative flex items-center justify-center rounded-xl border-2 font-mono font-bold text-base
                      w-14 h-14
                      ${isCurr
                        ? "bg-amber-900/55 border-amber-400 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.6)]"
                        : isDep
                        ? "bg-blue-900/45 border-blue-400/70 text-blue-200 shadow-[0_0_10px_rgba(96,165,250,0.35)]"
                        : isComp
                        ? "bg-emerald-950/60 border-emerald-700/40 text-emerald-300"
                        : "bg-[#0b1628] border-slate-700/40 text-white/20"
                      }`}
                  >
                    {/* Pulsing ring on current cell */}
                    {isCurr && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border-2 border-amber-400/25"
                        animate={{ scale: [1, 1.28, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                    )}
                    <AnimatePresence mode="wait">
                      {val !== null ? (
                        <motion.span
                          key={`v-${i}-${val}`}
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 360, damping: 22 }}
                        >
                          {val}
                        </motion.span>
                      ) : (
                        <motion.span
                          key="q"
                          className="text-white/20 text-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          ?
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="text-[10px] font-mono text-white/30 tabular-nums">{i}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2D dependency roles ───────────────────────────────────────────────────────

const DEP_COLORS = {
  top:      { bg: "bg-blue-900/60",    border: "border-blue-400",    text: "text-blue-100",    label: "↑" },
  left:     { bg: "bg-emerald-900/60", border: "border-emerald-400", text: "text-emerald-100", label: "←" },
  diagonal: { bg: "bg-purple-900/60",  border: "border-purple-400",  text: "text-purple-100",  label: "↖" },
  other:    { bg: "bg-slate-700/50",   border: "border-slate-500",   text: "text-slate-200",   label: "◆" },
} as const;

type DepRole = keyof typeof DEP_COLORS;

function depRole(cell: [number, number], curr: [number, number]): DepRole {
  const dr = curr[0] - cell[0];
  const dc = curr[1] - cell[1];
  if (dr === 1 && dc === 0) return "top";
  if (dr === 0 && dc === 1) return "left";
  if (dr === 1 && dc === 1) return "diagonal";
  return "other";
}

// ─── 2D View ──────────────────────────────────────────────────────────────────

function DP2DView({ state }: { state: DPState }) {
  const table    = state.dpTable   ?? [];
  const rows     = state.rows      ?? table.length;
  const cols     = state.cols      ?? (table[0]?.length ?? 0);
  const curr     = state.currentCell ?? null;
  const deps     = state.dependencies2d ?? [];
  const rowChars = state.rowChars ?? [];
  const colChars = state.colChars ?? [];

  const depMap = useMemo(() => {
    const m = new Map<string, DepRole>();
    if (curr) deps.forEach(d => m.set(`${d[0]},${d[1]}`, depRole(d, curr)));
    return m;
  }, [deps, curr]);

  // Responsive cell size
  const cs = cols > 9 ? 32 : cols > 7 ? 38 : cols > 5 ? 43 : 48;
  const fontSize = cs > 42 ? 14 : cs > 36 ? 12 : 10;

  // Roles that are actually used (to show in legend)
  const usedRoles = useMemo(
    () => [...new Set([...depMap.values()])] as DepRole[],
    [depMap]
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse" style={{ fontSize }}>
        <thead>
          <tr>
            {/* Corner */}
            <th style={{ width: cs, minWidth: cs }} />
            {/* Row-axis label spacer */}
            <th style={{ width: 4 }} />
            {/* Column headers */}
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} style={{ width: cs, minWidth: cs, padding: 2 }}>
                <div className="flex flex-col items-center justify-end" style={{ height: cs }}>
                  {colChars[c - 1] !== undefined && (
                    <span className={`font-mono font-bold leading-none ${curr && curr[1] === c ? "text-amber-300" : "text-white/55"}`}>
                      {colChars[c - 1]}
                    </span>
                  )}
                  <span className="text-[9px] text-white/25 tabular-nums leading-none mt-0.5">{c}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {/* Row header */}
              <td style={{ padding: 2 }}>
                <div className="flex flex-col items-end justify-center pr-1" style={{ width: cs, height: cs }}>
                  {rowChars[r - 1] !== undefined && (
                    <span className={`font-mono font-bold leading-none ${curr && curr[0] === r ? "text-amber-300" : "text-white/55"}`}>
                      {rowChars[r - 1]}
                    </span>
                  )}
                  <span className="text-[9px] text-white/25 tabular-nums leading-none mt-0.5">{r}</span>
                </div>
              </td>
              {/* Spacer */}
              <td style={{ width: 4 }} />
              {/* DP cells */}
              {Array.from({ length: cols }, (_, c) => {
                const val    = table[r]?.[c] ?? null;
                const isCurr = curr !== null && curr[0] === r && curr[1] === c;
                const role   = depMap.get(`${r},${c}`);
                const isDep  = role !== undefined;
                const isComp = val !== null && !isCurr && !isDep;
                const dc     = isDep ? DEP_COLORS[role!] : null;

                return (
                  <td key={c} style={{ padding: 2 }}>
                    <motion.div
                      className={`relative flex items-center justify-center rounded-lg border-2 font-mono font-bold select-none
                        ${isCurr
                          ? "bg-amber-900/55 border-amber-400 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.6)]"
                          : isDep
                          ? `${dc!.bg} ${dc!.border} ${dc!.text}`
                          : isComp
                          ? "bg-[#0f1e35] border-slate-700/40 text-white/70"
                          : "bg-[#0a1425] border-slate-800/40 text-white/18"
                        }`}
                      style={{ width: cs, height: cs }}
                      animate={isCurr ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                      transition={isCurr ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                    >
                      {isCurr && (
                        <motion.div
                          className="absolute inset-0 rounded-lg border-2 border-amber-400/20"
                          animate={{ scale: [1, 1.32, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        />
                      )}
                      {isDep && (
                        <span className="absolute top-0.5 right-0.5 leading-none" style={{ fontSize: 8, opacity: 0.65 }}>
                          {dc!.label}
                        </span>
                      )}
                      <AnimatePresence mode="wait">
                        {val !== null ? (
                          <motion.span
                            key={`v-${r}-${c}-${val}`}
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 380, damping: 24 }}
                          >
                            {val}
                          </motion.span>
                        ) : (
                          <motion.span
                            key="q"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-white/20"
                            style={{ fontSize: fontSize - 1 }}
                          >
                            ?
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend — only show roles that actually appear this step */}
      {usedRoles.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {usedRoles.map(role => {
            const s = DEP_COLORS[role];
            return (
              <div key={role} className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded border-2 ${s.bg} ${s.border}`} />
                <span className="text-[10px] text-white/40 capitalize">{s.label} {role}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border-2 bg-amber-900/55 border-amber-400" />
            <span className="text-[10px] text-white/40">current</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function DPVisualizer({ step }: { step: VisualizationStep }) {
  const state = (step.state || {}) as DPState;

  const dpType   = state.dpType ?? (state.dpTable ? "2d" : "1d");
  const formula  = state.formula  ?? "";
  const decision = state.decision ?? step.description ?? "";
  const actionLog = state.actionLog ?? [];

  return (
    <div className="w-full flex flex-col gap-3">

      {/* Formula + decision */}
      {(formula || decision) && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3">
          {formula && (
            <div className="font-mono text-sm font-bold text-amber-200 mb-1.5 leading-relaxed">
              {formula}
            </div>
          )}
          {decision && (
            <div className="text-sm text-white/75 leading-relaxed">{decision}</div>
          )}
        </div>
      )}

      {/* Visualization */}
      <div className="rounded-xl border border-blue-900/40 bg-[#050e1f] p-4 overflow-x-auto">
        {dpType === "2d"
          ? <DP2DView state={state} />
          : <DP1DView state={state} />
        }
      </div>

      {/* Action log */}
      {actionLog.length > 0 && (
        <div className="rounded-xl border border-slate-700/30 bg-[#070d1a] p-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Action Log
          </div>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
            {actionLog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02, duration: 0.17 }}
                className={`flex gap-2 text-xs font-mono ${
                  i === actionLog.length - 1 ? "text-amber-300" : "text-white/35"
                }`}
              >
                <span className="text-white/20 w-5 text-right tabular-nums shrink-0">{i + 1}.</span>
                <span>{entry}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
