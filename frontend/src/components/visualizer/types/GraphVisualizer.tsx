import React from "react";
import { motion } from "framer-motion";
import { VisualizationStep } from "@workspace/api-client-react";

export function GraphVisualizer({ step }: { step: VisualizationStep }) {
  const nodes = (step.state?.nodes as { id: number, label: string, x: number, y: number }[]) || [];
  const edges = (step.state?.edges as { source: number, target: number }[]) || [];
  const highlights = step.highlight || []; // Highlights usually denote node IDs for graphs

  // A basic static grid representation if x,y aren't provided by the backend.
  // In a real advanced visualizer, we'd use a force-directed layout like d3 or react-flow.
  // We'll create a simple circular layout here based on node count.

  const radius = 100;
  const centerX = 150;
  const centerY = 150;

  const positionedNodes = nodes.map((n, i) => {
    if (n.x !== undefined && n.y !== undefined) return n;
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    return {
      ...n,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  return (
    <div className="relative w-[300px] h-[300px] mx-auto">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge, idx) => {
          const sourceNode = positionedNodes.find(n => n.id === edge.source);
          const targetNode = positionedNodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;
          
          const isHighlighted = highlights.includes(edge.source) && highlights.includes(edge.target);

          return (
            <motion.line
              key={`e-${idx}`}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={isHighlighted ? "rgba(59, 130, 246, 0.8)" : "rgba(255, 255, 255, 0.2)"}
              strokeWidth={isHighlighted ? 3 : 2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          );
        })}
      </svg>

      {positionedNodes.map((node) => {
        const isHighlighted = highlights.includes(node.id);
        
        return (
          <motion.div
            key={node.id}
            initial={{ scale: 0 }}
            animate={{ 
              scale: isHighlighted ? 1.2 : 1,
            }}
            transition={{ type: "spring", stiffness: 200 }}
            className={`
              absolute flex items-center justify-center w-12 h-12 rounded-full font-mono font-bold
              border-2 transform -translate-x-1/2 -translate-y-1/2
              ${isHighlighted 
                ? "bg-secondary/20 border-secondary text-secondary shadow-[0_0_20px_rgba(139,92,246,0.6)] z-10" 
                : "bg-black border-white/20 text-white/80"}
            `}
            style={{ left: node.x, top: node.y }}
          >
            {node.label || node.id}
          </motion.div>
        );
      })}
    </div>
  );
}
