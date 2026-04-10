import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, CheckSquare } from "lucide-react";
import { StepExplanation as StepExplanationData } from "@workspace/api-client-react";

interface StepExplanationProps {
  explanation: StepExplanationData;
  stepIndex: number;
}

function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          const code = part.slice(1, -1);
          return (
            <code
              key={i}
              className="inline-block px-1.5 py-0.5 rounded text-[0.8em] font-mono bg-[#1a2e2a] text-teal-300 border border-teal-700/40 mx-0.5"
            >
              {code}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function StepExplanation({ explanation, stepIndex }: StepExplanationProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="w-full rounded-xl border border-white/8 bg-[#0d1117] overflow-hidden"
      >
        {/* Before state */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-[#111827]">
          <Pin className="w-4 h-4 text-amber-400 flex-shrink-0" style={{ transform: "rotate(45deg)" }} />
          <span className="font-mono text-sm text-amber-300 leading-relaxed">
            <InlineCode text={explanation.before} />
          </span>
        </div>

        {/* Sub-steps */}
        <div className="px-5 py-4 flex flex-col gap-3">
          {explanation.sub_steps.map((sub, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1e3a5f] border border-blue-500/30 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-bold text-blue-300">{i + 1}</span>
              </div>
              <p className="text-[0.92rem] text-white/85 leading-relaxed">
                <InlineCode text={sub} />
              </p>
            </motion.div>
          ))}
        </div>

        {/* After state */}
        <div className="flex items-start gap-3 px-5 py-3 border-t border-white/5 bg-[#0f1f18]">
          <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <span className="font-mono text-sm text-green-300 leading-relaxed">
            <InlineCode text={explanation.after} />
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
