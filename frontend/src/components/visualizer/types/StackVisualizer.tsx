import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

interface StackState {
  stack?: (number | string)[];
  operation?: "push" | "pop" | "peek" | "idle" | string;
  pushValue?: number | string | null;
  popValue?: number | string | null;
  peekValue?: number | string | null;
  inputArray?: (number | string)[];
  currentIndex?: number | null;
  result?: (number | string)[];
  decision?: string | null;
  actionLog?: string[];
  minVal?: number | string | null;
}

const OP_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  push: { bg: "bg-emerald-900/30", border: "border-emerald-500/50", text: "text-emerald-300", label: "PUSH" },
  pop:  { bg: "bg-red-900/30",     border: "border-red-500/50",     text: "text-red-300",     label: "POP"  },
  peek: { bg: "bg-amber-900/30",   border: "border-amber-500/50",   text: "text-amber-300",   label: "PEEK" },
  idle: { bg: "bg-slate-800/30",   border: "border-slate-600/30",   text: "text-slate-400",   label: "IDLE" },
};

function opStyle(op: string) {
  return OP_STYLES[op] ?? OP_STYLES.idle;
}

// ─── Single stack row ─────────────────────────────────────────────────────────
function StackRow({
  value,
  index,
  isTop,
  variant,
}: {
  value: number | string;
  index: number;
  isTop: boolean;
  variant: "normal" | "new" | "popping" | "ghost";
}) {
  const initial =
    variant === "new"
      ? { y: -60, opacity: 0, scale: 0.85 }
      : variant === "ghost"
      ? { y: 0, opacity: 0.7, scale: 1 }
      : { opacity: 1, scale: 1 };

  const exit =
    variant === "ghost" || variant === "popping"
      ? { y: -60, opacity: 0, scale: 0.85, transition: { duration: 0.3, ease: "easeIn" } }
      : { opacity: 0, transition: { duration: 0.15 } };

  const rowClass =
    variant === "ghost" || variant === "popping"
      ? "bg-red-900/50 border-red-400 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.6)]"
      : isTop
      ? "bg-blue-900/55 border-blue-400/80 text-blue-100 shadow-[0_0_14px_rgba(59,130,246,0.45)]"
      : "bg-[#0b1628] border-slate-700/55 text-white/75";

  return (
    <motion.div
      layout
      initial={initial}
      animate={{ y: 0, opacity: variant === "ghost" ? 0.7 : 1, scale: 1 }}
      exit={exit}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className={`relative flex items-center justify-between px-4 h-12 w-full rounded-lg border-2 font-mono font-bold text-base ${rowClass}`}
    >
      <span className="text-xs font-normal text-white/25 select-none tabular-nums w-5">{index}</span>
      <span className="flex-1 text-center text-lg">{value}</span>
      <div className="w-10 flex justify-end">
        {(variant === "ghost" || variant === "popping") && (
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">POP</span>
        )}
        {isTop && variant !== "ghost" && variant !== "popping" && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-bold text-blue-400 uppercase tracking-wide"
          >
            TOP
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StackVisualizer({ step }: { step: VisualizationStep }) {
  const state = (step.state || {}) as StackState;

  const stack      = state.stack ?? [];
  const operation  = (state.operation ?? "idle").toLowerCase();
  const pushValue  = state.pushValue  ?? null;
  const popValue   = state.popValue   ?? null;
  const inputArray = state.inputArray ?? [];
  const currentIndex = state.currentIndex ?? null;
  const result     = state.result     ?? [];
  const decision   = state.decision   ?? "";
  const actionLog  = state.actionLog  ?? [];
  const minVal     = state.minVal     ?? null;

  const isPushing = operation === "push";
  const isPopping = operation === "pop";
  const op = opStyle(operation);

  // ── Pop ghost: show the popped element briefly on mount, then animate it out
  const [showGhost, setShowGhost] = useState(isPopping && popValue !== null);

  useEffect(() => {
    // Whenever this step mounts (component re-created on step change):
    // if it's a pop step, show ghost then remove it after a short delay
    if (isPopping && popValue !== null) {
      setShowGhost(true);
      const timer = setTimeout(() => setShowGhost(false), 350);
      return () => clearTimeout(timer);
    } else {
      setShowGhost(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only on mount (step remount resets this)

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex gap-3 items-start">

        {/* ── STACK PANEL ─────────────────────────────────────────────── */}
        <div className="w-52 shrink-0 rounded-xl border border-blue-900/50 bg-[#050e1f] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-blue-900/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">Stack</span>
            <span className="text-xs font-mono text-white/30">size: {stack.length}</span>
          </div>

          {/* Push incoming indicator */}
          <AnimatePresence>
            {isPushing && pushValue !== null && (
              <motion.div
                key="push-in"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 44, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="mx-3 mt-3 overflow-hidden flex items-center justify-center rounded-lg border-2 border-dashed border-emerald-500/60 bg-emerald-900/15"
              >
                <span className="text-emerald-300 text-xs font-mono font-bold whitespace-nowrap">
                  ↓ pushing {pushValue}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stack body — top rendered first */}
          <div className="p-3 flex flex-col gap-1.5 min-h-[180px] max-h-[340px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {/* Pop ghost — appears at top and flies up */}
              {showGhost && popValue !== null && (
                <StackRow
                  key={`ghost-${popValue}`}
                  value={popValue}
                  index={stack.length}
                  isTop={false}
                  variant="ghost"
                />
              )}

              {stack.length === 0 && !showGhost ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center text-xs text-white/20 italic py-8"
                >
                  empty
                </motion.div>
              ) : (
                [...stack].reverse().map((val, ri) => {
                  const actualIdx = stack.length - 1 - ri;
                  const isTop = actualIdx === stack.length - 1;
                  const isNew = isPushing && isTop;
                  return (
                    <StackRow
                      key={`${actualIdx}-${val}`}
                      value={val}
                      index={actualIdx}
                      isTop={isTop}
                      variant={isNew ? "new" : "normal"}
                    />
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Stack base bar */}
          <div className="mx-3 mb-3 h-1.5 rounded-full bg-slate-700/50" />
        </div>

        {/* ── RIGHT PANELS ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* Operation + decision */}
          <div className={`rounded-xl border px-4 py-3 ${op.bg} ${op.border}`}>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className={`text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded-lg bg-black/30 ${op.text}`}>
                {op.label}
              </span>
              {isPushing && pushValue !== null && (
                <span className="text-xs font-mono text-emerald-200 bg-emerald-900/30 px-2 py-0.5 rounded-md">
                  value: {pushValue}
                </span>
              )}
              {isPopping && popValue !== null && (
                <span className="text-xs font-mono text-red-200 bg-red-900/30 px-2 py-0.5 rounded-md">
                  removed: {popValue}
                </span>
              )}
              {minVal !== null && (
                <span className="text-xs font-mono text-amber-200 bg-amber-900/30 px-2 py-0.5 rounded-md ml-auto">
                  min = {minVal}
                </span>
              )}
            </div>
            {decision && (
              <p className="text-sm text-white/80 leading-relaxed">{decision}</p>
            )}
          </div>

          {/* Input array with current pointer */}
          {inputArray.length > 0 && (
            <div className="rounded-xl border border-slate-700/40 bg-[#070d1a] p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2.5">Input</div>
              <div className="flex flex-wrap gap-2 pb-4">
                {inputArray.map((val, i) => {
                  const isCurrent = i === currentIndex;
                  const isPast    = currentIndex !== null && i < currentIndex;
                  return (
                    <motion.div
                      key={i}
                      animate={isCurrent ? { scale: 1.18, y: -5 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className={`
                        relative flex items-center justify-center w-10 h-10 rounded-lg border font-mono font-bold text-sm
                        ${isCurrent
                          ? "bg-amber-900/50 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                          : isPast
                          ? "bg-slate-800/20 border-slate-700/25 text-white/20"
                          : "bg-[#0b1628] border-slate-700/50 text-white/70"}
                      `}
                    >
                      {val}
                      <span className="absolute -bottom-4 text-[9px] text-white/25 font-mono tabular-nums">{i}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result array */}
          {result.length > 0 && (
            <div className="rounded-xl border border-purple-900/40 bg-[#0a0818] p-3">
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-2.5">Result</div>
              <div className="flex flex-wrap gap-2">
                {result.map((val, i) => (
                  <motion.div
                    key={`${i}-${val}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.03, type: "spring", stiffness: 280, damping: 22 }}
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-lg border font-mono font-bold text-sm
                      ${val === -1 || val === 0
                        ? "border-slate-700/40 bg-slate-800/30 text-white/30"
                        : "border-purple-500/50 bg-purple-900/30 text-purple-200"}
                    `}
                  >
                    {val}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action log */}
      {actionLog.length > 0 && (
        <div className="rounded-xl border border-slate-700/30 bg-[#070d1a] p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Action Log</div>
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
            {actionLog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.18 }}
                className={`flex items-start gap-2 text-xs font-mono ${
                  i === actionLog.length - 1 ? "text-blue-300" : "text-white/35"
                }`}
              >
                <span className="text-white/20 shrink-0 tabular-nums w-5 text-right">{i + 1}.</span>
                <span>{entry}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
