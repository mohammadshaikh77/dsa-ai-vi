import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus, Trash2, MoveRight } from "lucide-react";
import { VisualizationStep } from "@workspace/api-client-react";

interface LinkedListNode {
  val: number | string;
  id: number | string;
  next?: number | string | null;
}

interface LinkedListState {
  nodes?: LinkedListNode[];
  head?: number | string;
  current?: number | string;
  pointers?: Record<string, number | string>;
  inserting?: { val: number | string; after?: number | string } | null;
  deleted?: number | string | null;
  operation?: string;
}

interface LinkedListVisualizerProps {
  step: VisualizationStep;
  allSteps: VisualizationStep[];
  currentStepIndex: number;
}

// ─── Pointer color palette ────────────────────────────────────────────────────
const POINTER_COLORS: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  slow:    { bg: "bg-emerald-500",  text: "text-emerald-200",  ring: "border-emerald-400",  glow: "shadow-[0_0_18px_rgba(52,211,153,0.55)]"  },
  fast:    { bg: "bg-rose-500",     text: "text-rose-200",     ring: "border-rose-400",     glow: "shadow-[0_0_18px_rgba(251,113,133,0.55)]"  },
  prev:    { bg: "bg-violet-500",   text: "text-violet-200",   ring: "border-violet-400",   glow: "shadow-[0_0_18px_rgba(167,139,250,0.55)]"  },
  curr:    { bg: "bg-blue-500",     text: "text-blue-200",     ring: "border-blue-400",     glow: "shadow-[0_0_18px_rgba(96,165,250,0.55)]"   },
  current: { bg: "bg-blue-500",     text: "text-blue-200",     ring: "border-blue-400",     glow: "shadow-[0_0_18px_rgba(96,165,250,0.55)]"   },
  next:    { bg: "bg-amber-500",    text: "text-amber-200",    ring: "border-amber-400",    glow: "shadow-[0_0_18px_rgba(251,191,36,0.55)]"   },
  p1:      { bg: "bg-cyan-500",     text: "text-cyan-200",     ring: "border-cyan-400",     glow: "shadow-[0_0_18px_rgba(34,211,238,0.55)]"   },
  p2:      { bg: "bg-fuchsia-500",  text: "text-fuchsia-200",  ring: "border-fuchsia-400",  glow: "shadow-[0_0_18px_rgba(232,121,249,0.55)]"  },
};
const DEFAULT_PTR = { bg: "bg-sky-500", text: "text-sky-200", ring: "border-sky-400", glow: "shadow-[0_0_18px_rgba(56,189,248,0.55)]" };

function getPointerColor(name: string) {
  return POINTER_COLORS[name.toLowerCase()] ?? DEFAULT_PTR;
}

// ─── Chain layout constants (must match node/arrow dimensions below) ──────────
const CHAIN_HEAD_W = 44;    // approximate width of HEAD section + mr-2
const CHAIN_NODE_W = 56;    // w-14
const CHAIN_ARROW_W = 32;   // arrow SVG width
const CHAIN_STEP = CHAIN_NODE_W + CHAIN_ARROW_W; // 88 per node slot

function chainNodeCX(idx: number) {
  return CHAIN_HEAD_W + idx * CHAIN_STEP + CHAIN_NODE_W / 2;
}

// ─── Action label helpers ─────────────────────────────────────────────────────
function inferOperation(description: string): "traverse" | "insert" | "delete" | "move" | "other" {
  const d = description.toLowerCase();
  if (d.includes("insert") || d.includes("add")) return "insert";
  if (d.includes("delet") || d.includes("remov")) return "delete";
  if (d.includes("travers") || d.includes("visit")) return "traverse";
  if (d.includes("move") || d.includes("point") || d.includes("advance") || d.includes("step")) return "move";
  return "other";
}

function getActionLabel(step: VisualizationStep, idx: number) {
  const op = inferOperation(step.description || "");
  const state = step.state as LinkedListState;
  const nodes = state?.nodes || [];
  const pointers = state?.pointers || {};
  const currentId = state?.current ?? Object.values(pointers)[0];
  const currentNode = nodes.find((n) => String(n.id) === String(currentId));
  const inserting = state?.inserting;
  const deleted = state?.deleted;

  if (op === "insert" && inserting) {
    const afterNode = nodes.find((n) => String(n.id) === String(inserting.after));
    return { type: "insert" as const, label: `Insert ${inserting.val}`, sub: afterNode ? `after node ${afterNode.val}` : "" };
  }
  if (op === "delete") {
    return { type: "delete" as const, label: `Delete ${deleted ?? currentNode?.val ?? ""}`, sub: "" };
  }
  const ptrNames = Object.keys(pointers);
  if (ptrNames.length > 1) {
    const label = ptrNames.map((name) => {
      const n = nodes.find((n) => String(n.id) === String(pointers[name]));
      return `${name}→${n?.val ?? "?"}`;
    }).join("  ");
    return { type: "move" as const, label, sub: "" };
  }
  if (op === "traverse" && currentNode) return { type: "traverse" as const, label: `Traverse ${currentNode.val}`, sub: "" };
  if (op === "move" && currentNode) return { type: "move" as const, label: `Move to ${currentNode.val}`, sub: "" };
  return { type: "other" as const, label: step.description?.slice(0, 38) ?? `Step ${idx + 1}`, sub: "" };
}

function ActionIcon({ type, index }: { type: string; index: number }) {
  if (type === "insert")   return <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"><Plus className="w-3 h-3 text-white" /></div>;
  if (type === "delete")   return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"><Trash2 className="w-3 h-3 text-white" /></div>;
  if (type === "traverse") return <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><MoveRight className="w-3 h-3 text-white" /></div>;
  if (type === "move")     return <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-3 h-3 text-white" /></div>;
  return <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><span className="text-white text-[9px] font-bold">{index + 1}</span></div>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LinkedListVisualizer({ step, allSteps, currentStepIndex }: LinkedListVisualizerProps) {
  const state = step.state as LinkedListState;
  const highlights = (step.highlight || []) as (number | string)[];

  const rawNodes: LinkedListNode[] = state?.nodes || [];
  const headId = state?.head;
  const inserting = state?.inserting;
  const rawPointers: Record<string, number | string> = state?.pointers
    ? { ...state.pointers }
    : state?.current != null
      ? { curr: state.current }
      : {};

  // ── Build ordered node chain by following next pointers ────────────────────
  const nodeMap = new Map<string, LinkedListNode>();
  rawNodes.forEach((n) => nodeMap.set(String(n.id), n));

  const reachableIds = new Set<string>();
  const reachableChain: LinkedListNode[] = [];
  let hasCycle = false; // true only when traversal actually found a back-edge loop

  if (headId !== undefined && nodeMap.has(String(headId))) {
    let cur: LinkedListNode | undefined = nodeMap.get(String(headId));
    const guard = new Set<string>();
    while (cur && !guard.has(String(cur.id))) {
      guard.add(String(cur.id));
      reachableIds.add(String(cur.id));
      reachableChain.push(cur);
      if (cur.next != null && reachableIds.has(String(cur.next))) {
        hasCycle = true; // genuine cycle: chain loops back to a visited node
        break;
      }
      cur = cur.next != null ? nodeMap.get(String(cur.next)) : undefined;
    }
  }
  const extraNodes = rawNodes.filter((n) => !reachableIds.has(String(n.id)));
  const orderedNodes = reachableChain.length > 0 ? [...reachableChain, ...extraNodes] : rawNodes;

  // ── Cycle detection: ONLY active when the HEAD traversal found a real back-edge
  //    (prevents reversal steps from being misread as cycles)
  const cycleTargetId = hasCycle ? (() => {
    for (const n of orderedNodes) {
      if (n.next == null) continue;
      const srcIdx = orderedNodes.findIndex((x) => String(x.id) === String(n.id));
      const tgtIdx = orderedNodes.findIndex((x) => String(x.id) === String(n.next));
      if (tgtIdx !== -1 && tgtIdx < srcIdx) return String(n.next);
    }
    return null;
  })() : null;

  // Index of the tail (the node whose .next is the cycle entry)
  const cycleTailIdx = cycleTargetId !== null
    ? orderedNodes.findIndex(n => n.next != null && String(n.next) === cycleTargetId)
    : -1;
  const cycleEntryIdx = cycleTargetId !== null
    ? orderedNodes.findIndex(n => String(n.id) === cycleTargetId)
    : -1;

  // ── Pointer → node mapping ─────────────────────────────────────────────────
  const nodePtrLabels = new Map<string, string[]>();
  for (const [name, nodeId] of Object.entries(rawPointers)) {
    const key = String(nodeId);
    if (!nodePtrLabels.has(key)) nodePtrLabels.set(key, []);
    nodePtrLabels.get(key)!.push(name);
  }

  const insertAfterIdx = inserting?.after != null
    ? orderedNodes.findIndex((n) => String(n.id) === String(inserting.after))
    : -1;
  const insertingAfterNode = inserting?.after != null
    ? rawNodes.find((n) => String(n.id) === String(inserting.after))
    : null;

  const isHighlighted = (id: number | string) => highlights.some((h) => String(h) === String(id));

  // A node is truly "detached" only when it has no active pointers pointing to it,
  // no incoming edges from any other node, and no outgoing edge to another node.
  // This prevents reversal steps from incorrectly styling "unreachable-from-head"
  // nodes as disconnected — during reversal those nodes are still part of the chain.
  const isDisconnected = (id: number | string) => {
    const idStr = String(id);
    if (reachableIds.has(idStr) || reachableIds.size === 0) return false;
    // Has an active pointer → not disconnected
    if (Object.values(rawPointers).some(pId => String(pId) === idStr)) return false;
    // Has an incoming edge from any node → not disconnected
    if (rawNodes.some(n => n.next != null && String(n.next) === idStr)) return false;
    // Has an outgoing edge to an existing node → not disconnected
    const node = nodeMap.get(idStr);
    if (node?.next != null && nodeMap.has(String(node.next))) return false;
    return true;
  };

  // Forward arrow: node.next points directly to nextNode (right-to-left in display)
  const hasArrowToNext = (node: LinkedListNode, nextNode: LinkedListNode) =>
    node.next != null && String(node.next) === String(nextNode.id);

  // Backward arrow: nextNode.next points back to node — a reversed edge (shown in red)
  const hasBackwardArrow = (node: LinkedListNode, nextNode: LinkedListNode) =>
    nextNode.next != null && String(nextNode.next) === String(node.id) && !hasCycle;

  const ptrEntries = Object.entries(rawPointers);
  const pastSteps  = allSteps.slice(0, currentStepIndex + 1);
  const nextSteps  = allSteps.slice(currentStepIndex + 1, currentStepIndex + 3);

  // True when at least one reversed edge (← arrow) exists in the current step
  const hasAnyReversedEdge = !hasCycle && orderedNodes.some((node, i) => {
    const nextNode = orderedNodes[i + 1];
    return nextNode ? hasBackwardArrow(node, nextNode) : false;
  });

  // ── Cycle arc SVG: U-shaped bezier below chain ────────────────────────────
  const cycleArc = cycleTargetId && cycleTailIdx !== -1 && cycleEntryIdx !== -1 ? (() => {
    const tx = chainNodeCX(cycleTailIdx);
    const ex = chainNodeCX(cycleEntryIdx);
    const svgW = CHAIN_HEAD_W + orderedNodes.length * CHAIN_STEP + 64;
    const depth = 30;
    // Cubic bezier: start at tail bottom, arc down to arc bottom, rise up to entry bottom
    const pathD = `M ${tx} 4 C ${tx} ${depth + 4}, ${ex} ${depth + 4}, ${ex} 4`;
    return { tx, ex, svgW, depth, pathD };
  })() : null;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* ── Panel A: Node chain ─────────────────────────────────────────────── */}
      <div className="md:col-span-2 rounded-xl border border-blue-500/30 bg-blue-950/20 overflow-hidden">
        <div className="bg-blue-600/80 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
          <span className="text-white font-semibold text-sm tracking-wide">(A) Linked List</span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pointer name badges */}
            {ptrEntries.map(([name]) => {
              const c = getPointerColor(name);
              return (
                <span key={name} className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} bg-opacity-80`}>
                  {name}
                </span>
              );
            })}
            {/* Reversed edge legend — only visible when reversal steps are active */}
            {hasAnyReversedEdge && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-red-300 border border-red-400/40 px-2 py-0.5 rounded-full bg-red-900/30">
                <svg width="18" height="10" className="inline-block">
                  <line x1="17" y1="5" x2="1" y2="5" stroke="#f87171" strokeWidth="1.5" />
                  <polygon points="1,5 7,2 7,8" fill="#f87171" />
                </svg>
                reversed edge
              </span>
            )}
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          {/* Node chain flex row */}
          <div className="flex items-start flex-nowrap min-w-max gap-0">
            {/* HEAD label */}
            <div className="flex flex-col items-center mr-2 mt-7">
              <span className="text-xs font-bold text-blue-400">HEAD</span>
              <ArrowRight className="w-5 h-5 text-blue-400 mt-1" />
            </div>

            {orderedNodes.map((node, idx) => {
              const ptrs = nodePtrLabels.get(String(node.id)) || [];
              const hasPointer   = ptrs.length > 0;
              const highlighted  = isHighlighted(node.id);
              const disconnected = isDisconnected(node.id);
              const isCycleEntry = cycleTargetId !== null && String(node.id) === cycleTargetId;
              const isCycleTail  = idx === cycleTailIdx;
              const showInsertArrow = insertAfterIdx === idx;
              const nextNode = orderedNodes[idx + 1];
              const arrowConnected   = nextNode ? hasArrowToNext(node, nextNode) : false;
              const arrowReversed    = nextNode ? hasBackwardArrow(node, nextNode) : false;
              const hasNext = idx < orderedNodes.length - 1;

              const primaryColor = ptrs.length > 0
                ? getPointerColor(ptrs[0])
                : highlighted
                  ? getPointerColor("curr")
                  : null;

              return (
                <React.Fragment key={String(node.id)}>
                  <div className="flex flex-col items-center">
                    {/* Pointer labels above node */}
                    <div className="flex flex-col items-center gap-0.5 mb-1 min-h-[28px] justify-end">
                      {ptrs.map((name) => {
                        const c = getPointerColor(name);
                        return (
                          <motion.span
                            key={name}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${c.bg} ${c.text} leading-none whitespace-nowrap`}
                          >
                            {name}
                          </motion.span>
                        );
                      })}
                      {ptrs.length > 0 && <div className="w-px h-2 bg-white/30" />}
                    </div>

                    {/* Node box */}
                    <motion.div
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`
                        relative w-14 h-14 flex items-center justify-center rounded-lg border-2
                        font-mono font-bold text-lg transition-all duration-300 cursor-default
                        ${disconnected
                          ? "border-orange-400/60 bg-orange-900/20 text-orange-200"
                          : hasPointer
                            ? `${primaryColor!.ring} bg-black/50 ${primaryColor!.text} ${primaryColor!.glow} scale-110`
                            : highlighted
                              ? "border-blue-400 bg-blue-500/20 text-blue-200 shadow-[0_0_14px_rgba(59,130,246,0.4)]"
                              : isCycleEntry && !hasPointer
                                ? "border-orange-400 bg-orange-900/25 text-orange-100 shadow-[0_0_14px_rgba(249,115,22,0.45)]"
                                : "border-white/20 bg-black/40 text-white/80"
                        }
                      `}
                    >
                      {node.val}

                      {/* Pointer pulse */}
                      {hasPointer && (
                        <motion.div
                          className="absolute inset-0 rounded-lg"
                          style={{ background: "transparent" }}
                          animate={{ opacity: [0.2, 0.6, 0.2] }}
                          transition={{ repeat: Infinity, duration: 1.4 }}
                        />
                      )}

                      {/* Cycle entry badge */}
                      {isCycleEntry && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center border border-orange-300">
                          <span className="text-[8px] text-white font-bold">⟲</span>
                        </div>
                      )}

                      {/* Detached badge */}
                      {disconnected && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[9px] text-orange-300/70">detached</span>
                        </div>
                      )}
                    </motion.div>

                    {/* Insertion node appearing below */}
                    {showInsertArrow && inserting && (
                      <div className="flex flex-col items-center mt-2">
                        <svg width="2" height="28" className="overflow-visible">
                          <line x1="1" y1="0" x2="1" y2="28" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,3" />
                          <polygon points="1,28 -4,18 6,18" fill="#f59e0b" />
                        </svg>
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-14 h-14 flex items-center justify-center rounded-lg border-2 border-amber-400 bg-amber-400/20 text-amber-200 font-mono font-bold text-lg shadow-[0_0_16px_rgba(251,191,36,0.5)]"
                        >
                          {inserting.val}
                        </motion.div>
                      </div>
                    )}
                  </div>

                  {/* Arrow between nodes: forward (→), reversed (←), or unconnected */}
                  {hasNext && (
                    <div className="flex items-center self-center mx-0.5 mt-7">
                      <svg width="32" height="16" className="overflow-visible">
                        {arrowConnected ? (
                          // Forward right-pointing arrow
                          <>
                            <line x1="0" y1="8" x2="26" y2="8"
                              stroke={showInsertArrow ? "#f87171" : "rgba(255,255,255,0.35)"}
                              strokeWidth="2"
                              strokeDasharray={showInsertArrow ? "4,3" : undefined}
                            />
                            <polygon points="26,8 17,4 17,12"
                              fill={showInsertArrow ? "#f87171" : "rgba(255,255,255,0.35)"} />
                          </>
                        ) : arrowReversed ? (
                          // Reversed left-pointing arrow (shown in red — edge was flipped)
                          <>
                            <line x1="26" y1="8" x2="0" y2="8" stroke="#f87171" strokeWidth="2" />
                            <polygon points="0,8 9,4 9,12" fill="#f87171" />
                          </>
                        ) : (
                          // No direct edge — faint placeholder
                          <>
                            <line x1="0" y1="8" x2="26" y2="8" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeDasharray="3,4" />
                          </>
                        )}
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* NULL / CYCLE terminal badge */}
            <div className="flex items-center self-center gap-1 ml-1 mt-7">
              {cycleTargetId ? (
                <span className="text-xs font-mono text-orange-400/80 border border-orange-400/30 px-2 py-0.5 rounded bg-orange-900/20">
                  CYCLE
                </span>
              ) : (
                <span className="text-xs font-mono text-white/30">NULL</span>
              )}
            </div>
          </div>

          {/* ── Cycle arc SVG: U-shape below chain from tail → entry ─────────── */}
          {cycleArc && (
            <svg
              width={cycleArc.svgW}
              height={cycleArc.depth + 12}
              style={{ display: "block", marginTop: 0, overflow: "visible" }}
            >
              <defs>
                {/* Upward-pointing arrowhead for the cycle arc end */}
                <marker
                  id="cycle-head"
                  markerWidth="9"
                  markerHeight="9"
                  refX="4.5"
                  refY="0"
                  orient="auto"
                >
                  <path d="M 0,9 L 4.5,0 L 9,9 z" fill="#f97316" fillOpacity="0.85" />
                </marker>
              </defs>
              <motion.path
                d={cycleArc.pathD}
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeDasharray="5,3"
                markerEnd="url(#cycle-head)"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 0.85, pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <text
                x={(cycleArc.tx + cycleArc.ex) / 2}
                y={cycleArc.depth + 10}
                textAnchor="middle"
                fill="#fb923c"
                fontSize="9"
                fontFamily="monospace"
                opacity="0.65"
              >
                cycle back
              </text>
            </svg>
          )}

          {/* Cycle annotation */}
          {cycleTargetId && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-xs text-orange-300/80 font-mono">
                Cycle detected: tail.next → node{" "}
                <span className="text-orange-200 font-bold">
                  [{rawNodes.find(n => String(n.id) === cycleTargetId)?.val ?? cycleTargetId}]
                </span>
                {" "}(entry node)
              </span>
            </div>
          )}

          {inserting && (
            <div className="mt-2 text-center">
              <span className="text-xs text-amber-400/80 font-mono italic">
                Inserting {inserting.val}{insertingAfterNode ? ` after node ${insertingAfterNode.val}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel B: Active pointers ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-green-500/30 bg-green-950/20 overflow-hidden">
        <div className="bg-green-700/70 px-4 py-2">
          <span className="text-white font-semibold text-sm tracking-wide">(B) Active Pointers</span>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {ptrEntries.length === 0 ? (
            <p className="text-white/40 text-sm">No active pointers</p>
          ) : (
            ptrEntries.map(([name, nodeId]) => {
              const node = rawNodes.find((n) => String(n.id) === String(nodeId));
              const c = getPointerColor(name);
              return (
                <AnimatePresence key={name} mode="wait">
                  <motion.div
                    key={`${name}-${nodeId}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 border ${c.ring} bg-black/30`}
                  >
                    <span className={`font-mono font-bold text-sm ${c.text} w-14 flex-shrink-0`}>{name}</span>
                    <ArrowRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                    <span className="text-white font-mono font-bold text-lg">{node?.val ?? "?"}</span>
                    <span className="text-white/30 text-xs ml-auto font-mono">id={nodeId}</span>
                  </motion.div>
                </AnimatePresence>
              );
            })
          )}
        </div>
      </div>

      {/* ── Panel C: Action log ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 overflow-hidden">
        <div className="bg-red-700/70 px-4 py-2">
          <span className="text-white font-semibold text-sm tracking-wide">(C) Action Log</span>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
          {pastSteps.length === 0 ? (
            <p className="text-white/40 text-sm px-2">No actions yet</p>
          ) : (
            pastSteps.map((s, i) => {
              const action = getActionLabel(s, i);
              const isCurrent = i === currentStepIndex;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 border transition-all
                    ${isCurrent ? "bg-red-500/20 border-red-400/40" : "bg-black/20 border-white/5"}`}
                >
                  <ActionIcon type={action.type} index={i} />
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-sm ${isCurrent ? "text-white" : "text-white/70"}`}>
                      {action.label}
                    </span>
                    {action.sub && <p className="text-xs text-white/40 mt-0.5">{action.sub}</p>}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Panel D: Upcoming steps ──────────────────────────────────────────── */}
      <div className="md:col-span-2 rounded-xl border border-amber-500/30 bg-amber-950/20 overflow-hidden">
        <div className="bg-amber-700/70 px-4 py-2">
          <span className="text-white font-semibold text-sm tracking-wide">(D) Step Preview</span>
        </div>
        <div className="p-3 flex flex-row gap-3 flex-wrap">
          {nextSteps.length === 0 ? (
            <p className="text-white/40 text-sm px-2 py-1">No upcoming steps</p>
          ) : (
            nextSteps.map((s, i) => {
              const action = getActionLabel(s, currentStepIndex + 1 + i);
              return (
                <div key={i} className="flex items-center gap-2 bg-black/30 border border-amber-400/20 rounded-lg px-4 py-2">
                  <ActionIcon type={action.type} index={currentStepIndex + 1 + i} />
                  <span className="text-white/80 text-sm font-medium">{action.label}</span>
                  {action.sub && <span className="text-white/40 text-xs ml-1">{action.sub}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
