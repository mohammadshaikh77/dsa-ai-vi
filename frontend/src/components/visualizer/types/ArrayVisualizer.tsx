import React from "react";
import { motion } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

export function ArrayVisualizer({ step }: { step: VisualizationStep }) {
  const data = (step.state?.array as number[] | string[]) || [];
  const highlights = step.highlight || [];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-4">
      {data.map((item, idx) => {
        const isHighlighted = highlights.includes(idx);
        return (
          <motion.div
            key={idx}
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: isHighlighted ? 1.1 : 1, 
              opacity: 1,
              y: isHighlighted ? -5 : 0
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`
              relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl text-lg font-mono font-bold
              border-2 transition-colors duration-300
              ${isHighlighted 
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] z-10" 
                : "bg-black/40 border-white/10 text-white/70"}
            `}
          >
            {item}
            <span className="absolute -bottom-6 text-xs text-muted-foreground font-mono">
              {idx}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
