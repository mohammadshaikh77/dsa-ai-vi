import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { VisualizationStep } from "@workspace/api-client-react";
import { ArrayVisualizer } from "./types/ArrayVisualizer";
import { GraphVisualizer } from "./types/GraphVisualizer";
import { TreeVisualizer } from "./types/TreeVisualizer";
import { MatrixVisualizer } from "./types/MatrixVisualizer";
import { LinkedListVisualizer } from "./types/LinkedListVisualizer";
import { RecursionVisualizer } from "./types/RecursionVisualizer";
import { NQueensVisualizer } from "./types/NQueensVisualizer";
import { StackVisualizer } from "./types/StackVisualizer";
import { DPVisualizer } from "./types/DPVisualizer";
import { StepExplanation } from "./StepExplanation";

interface VisualizerCoreProps {
  steps: VisualizationStep[];
  title?: string;
}

export function VisualizerCore({ steps, title = "Algorithm Visualization" }: VisualizerCoreProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const playRef = useRef<number | null>(null);

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      const delay = 1000 / speed;
      playRef.current = window.setTimeout(handleNext, delay);
    } else if (playRef.current) {
      window.clearTimeout(playRef.current);
    }
    return () => {
      if (playRef.current) window.clearTimeout(playRef.current);
    };
  }, [isPlaying, currentStepIndex, speed, steps.length]);

  // Reset to step 0 when steps array changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [steps]);

  if (!steps || steps.length === 0) return null;

  const isLinkedList =
    currentStep.type === "linked_list" ||
    steps.some((s) => s.type === "linked_list");

  const isTree =
    currentStep.type === "tree" ||
    currentStep.type === "binary_tree" ||
    currentStep.type === "bst" ||
    steps.some((s) => s.type === "tree" || s.type === "binary_tree" || s.type === "bst");

  const isMatrix =
    currentStep.type === "matrix" ||
    steps.some((s) => s.type === "matrix");

  const isRecursion =
    currentStep.type === "recursion" ||
    currentStep.type === "backtracking" ||
    !!(currentStep.state as any)?.treeNodes ||
    steps.some((s) => s.type === "recursion" || s.type === "backtracking" || !!(s.state as any)?.treeNodes);

  const isNQueens =
    currentStep.type === "nqueens" ||
    !!(currentStep.state as any)?.queens ||
    steps.some((s) => s.type === "nqueens" || !!(s.state as any)?.queens);

  const isStack =
    currentStep.type === "stack" ||
    steps.some((s) => s.type === "stack");

  const isDP =
    currentStep.type === "dp" ||
    steps.some((s) => s.type === "dp");

  const renderVisualizer = () => {
    const type = currentStep.type;
    const state = currentStep.state as any;

    // N-Queens: dedicated board visualizer
    if (type === "nqueens" || state?.queens !== undefined) {
      return <NQueensVisualizer step={currentStep} />;
    }

    // Stack: vertical push/pop visualizer
    if (type === "stack") {
      return <StackVisualizer step={currentStep} />;
    }

    // DP: 1D array or 2D table visualizer
    if (type === "dp") {
      return <DPVisualizer step={currentStep} />;
    }

    // Smart content-based detection: if state has treeNodes it's a recursion tree
    // regardless of what type the AI wrote
    if (state?.treeNodes) {
      return <RecursionVisualizer step={currentStep} />;
    }

    if (type === "linked_list") {
      return (
        <LinkedListVisualizer
          step={currentStep}
          allSteps={steps}
          currentStepIndex={currentStepIndex}
        />
      );
    }

    switch (type) {
      case "array":
      case "sliding_window":
      case "stack":
      case "queue":
        return <ArrayVisualizer step={currentStep} />;
      case "graph":
        return <GraphVisualizer step={currentStep} />;
      case "recursion":
      case "backtracking":
        return <RecursionVisualizer step={currentStep} />;
      case "tree":
      case "binary_tree":
      case "bst":
        return <TreeVisualizer step={currentStep} />;
      case "matrix":
        return <MatrixVisualizer step={currentStep} />;
      default:
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Unsupported visualization type: {type}
          </div>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 p-6 rounded-xl glass-card border border-white/5">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          {currentStep.type.toUpperCase().replace("_", " ")}
        </Badge>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className={`w-full flex items-center justify-center bg-black/20 rounded-lg border border-white/5 overflow-hidden relative
        ${isLinkedList ? "p-4 min-h-[360px]" : isTree || isMatrix || isRecursion || isNQueens || isStack ? "p-4 min-h-[460px]" : "p-8 min-h-[300px]"}
      `}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col items-center justify-center gap-8"
          >
            {renderVisualizer()}
            {!isLinkedList && !isTree && !isMatrix && !isRecursion && !isNQueens && !isStack && (
              <div className="text-center max-w-2xl">
                <p className="text-lg text-white/90">{currentStep.description}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* For linked list, show description below the 4-panel layout */}
      {isLinkedList && (
        <div className="text-center px-4">
          <p className="text-sm text-white/70 italic">{currentStep.description}</p>
        </div>
      )}

      {/* Step Explanation Panel */}
      {currentStep.explanation && (
        <StepExplanation
          explanation={currentStep.explanation}
          stepIndex={currentStepIndex}
        />
      )}

      {/* Sticky controls bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="sticky bottom-4 z-30 mx-auto w-full max-w-2xl"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl bg-[rgba(5,10,26,0.82)]">
          {/* Playback buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="w-9 h-9 rounded-xl border border-white/10 hover:bg-white/8 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={currentStepIndex === steps.length - 1}
              className="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_18px_rgba(59,130,246,0.5)] transition-all hover:scale-110 active:scale-95 hover:shadow-[0_0_24px_rgba(59,130,246,0.7)]"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 fill-current" />
                : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1}
              className="w-9 h-9 rounded-xl border border-white/10 hover:bg-white/8 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Step counter pill */}
            <div className="ml-1 text-xs font-mono text-white/50 bg-white/5 border border-white/8 rounded-full px-3 py-1 select-none">
              {currentStepIndex + 1} / {steps.length}
            </div>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[180px]">
            <FastForward className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <Slider
              value={[speed]}
              min={0.5}
              max={3}
              step={0.5}
              onValueChange={(val) => setSpeed(val[0])}
              className="flex-1"
            />
            <span className="text-xs font-mono text-white/50 w-8 text-right shrink-0">{speed}x</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
