import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzeProblem, useGetPatternStats, getGetPatternStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Zap, Sparkles, Activity, BrainCircuit } from "lucide-react";
import { VisualizerCore } from "@/components/visualizer/VisualizerCore";
import { CodeViewer } from "@/components/visualizer/CodeViewer";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SAMPLE_PROBLEMS = [
  "Binary Search Tree",
  "Dijkstra's Path",
  "Quick Sort Pivot"
];

export default function Home() {
  const [problem, setProblem] = useState("");
  const { toast } = useToast();
  
  const { data: patternStats } = useGetPatternStats({
    query: { enabled: true, queryKey: getGetPatternStatsQueryKey() }
  });

  const analyzeMutation = useAnalyzeProblem();
  const result = analyzeMutation.data;

  const handleAnalyze = (textToAnalyze: string = problem) => {
    if (!textToAnalyze.trim()) {
      toast({
        title: "Input required",
        description: "Please enter a problem description to analyze.",
        variant: "destructive"
      });
      return;
    }
    
    analyzeMutation.mutate({
      data: { problem: textToAnalyze }
    });
  };

  const handleSampleClick = (sample: string) => {
    setProblem(sample);
    handleAnalyze(sample);
  };

  return (
    <div className="min-h-screen flex flex-col pt-16">
      <div className="container px-4 md:px-8 py-12 mx-auto flex-1 flex flex-col gap-16">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-6 max-w-4xl mx-auto">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            NEURAL ENGINE V2.0 ACTIVE
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Visualize Algorithms <br/>
            <span className="neon-text">Like Never Before</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Type a problem, and watch AlgoViz think like an expert. We parse your problem, determine the optimal pattern, and generate a step-by-step interactive visualization.
          </p>

          <div className="w-full mt-8 flex flex-col gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative glass-card rounded-xl p-2 flex flex-col gap-3">
                <Textarea
                  placeholder="e.g. Find the longest substring without repeating characters..."
                  className="min-h-[120px] bg-black/40 border-0 focus-visible:ring-0 text-lg resize-none text-white/90 placeholder:text-white/30"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="w-4 h-4 text-primary" />
                    AI Ready
                  </div>
                  <Button 
                    onClick={() => handleAnalyze()} 
                    disabled={analyzeMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.3)] gap-2 px-8"
                  >
                    {analyzeMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 animate-pulse" />
                        Analyzing...
                      </span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Visualize
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground mr-2">Try a sample:</span>
              {SAMPLE_PROBLEMS.map((sample) => (
                <Badge
                  key={sample}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/50 hover:text-white transition-colors bg-secondary/20 text-secondary-foreground border border-secondary/20"
                  onClick={() => handleSampleClick(sample)}
                >
                  {sample}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {analyzeMutation.isPending && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center gap-6 py-20"
            >
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-lg text-primary animate-pulse font-mono">Parsing problem context & generating visuals...</p>
            </motion.div>
          )}

          {result && !analyzeMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-6xl mx-auto flex flex-col gap-12 pb-20"
            >
              <div className="flex flex-wrap items-center gap-4">
                <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1 text-sm">
                  Pattern: {result.pattern}
                </Badge>
                <Badge className="bg-secondary/20 text-secondary border-secondary/30 px-4 py-1 text-sm">
                  Difficulty: {result.difficulty}
                </Badge>
              </div>

              <VisualizerCore steps={result.steps} title="Memory State Animation" />

              <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
                <Tabs defaultValue="optimal" className="w-full">
                  <div className="flex items-center justify-between px-6 pt-5 pb-0">
                    <h3 className="text-xl font-semibold text-white">Approach & Code</h3>
                    <TabsList className="bg-black/40 border border-white/5">
                      <TabsTrigger value="optimal" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary gap-2">
                        Optimal
                      </TabsTrigger>
                      <TabsTrigger value="bruteforce" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive gap-2">
                        Brute Force
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Optimal tab */}
                  <TabsContent value="optimal" className="p-6 flex flex-col gap-5">
                    <p className="text-white/80 leading-relaxed">{result.optimal}</p>
                    <CodeViewer
                      code={result.code}
                      timeComplexity={result.time_complexity}
                      spaceComplexity={result.space_complexity}
                    />
                  </TabsContent>

                  {/* Brute Force tab */}
                  <TabsContent value="bruteforce" className="p-6 flex flex-col gap-5">
                    <p className="text-white/80 leading-relaxed">{result.brute_force}</p>
                    {result.brute_force_code ? (
                      <CodeViewer
                        code={result.brute_force_code}
                        timeComplexity={result.brute_force_time_complexity}
                        spaceComplexity={result.brute_force_space_complexity}
                      />
                    ) : (
                      <div className="text-white/30 text-sm italic px-2">No brute force code available for this result.</div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Section (only show if no result yet) */}
        {!result && !analyzeMutation.isPending && Array.isArray(patternStats) && patternStats.length > 0 && (
          <section className="max-w-4xl mx-auto w-full mt-12 border-t border-white/10 pt-12">
            <h3 className="text-xl font-semibold mb-6 text-center text-white/80">Trending Patterns</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {patternStats.map((stat) => (
                <div key={stat.pattern} className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-lg">
                  <span className="font-mono text-sm text-white/90">{stat.pattern}</span>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{stat.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
