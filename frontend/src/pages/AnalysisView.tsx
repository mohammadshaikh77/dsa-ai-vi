import React from "react";
import { useParams, Link } from "wouter";
import { useGetAnalysisById, getGetAnalysisByIdQueryKey } from "@workspace/api-client-react";
import { VisualizerCore } from "@/components/visualizer/VisualizerCore";
import { CodeViewer } from "@/components/visualizer/CodeViewer";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AnalysisView() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);

  const { data: result, isLoading, isError } = useGetAnalysisById(id, {
    query: { enabled: !!id, queryKey: getGetAnalysisByIdQueryKey(id) }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-primary font-mono animate-pulse">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Analysis Not Found</h2>
          <p className="text-muted-foreground mb-6">This visualization may have been deleted or does not exist.</p>
          <Link href="/history">
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container max-w-6xl mx-auto px-4 md:px-8">
        <div className="mb-8">
          <Link href="/history">
            <Button variant="ghost" className="text-muted-foreground hover:text-white pl-0 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 line-clamp-2">
            {result.problem}
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1 text-sm">
              Pattern: {result.pattern}
            </Badge>
            <Badge className="bg-secondary/20 text-secondary border-secondary/30 px-4 py-1 text-sm">
              Difficulty: {result.difficulty}
            </Badge>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-12"
        >
          <VisualizerCore steps={result.steps} title="Memory State Animation" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-6 rounded-xl border border-white/5 flex flex-col gap-4">
              <h3 className="text-xl font-semibold text-white">Analysis</h3>
              <Tabs defaultValue="optimal" className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-black/40 border border-white/5">
                  <TabsTrigger value="optimal" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">Optimal Approach</TabsTrigger>
                  <TabsTrigger value="bruteforce" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">Brute Force</TabsTrigger>
                </TabsList>
                <TabsContent value="optimal" className="mt-4 text-white/80 leading-relaxed whitespace-pre-wrap">
                  {result.optimal}
                </TabsContent>
                <TabsContent value="bruteforce" className="mt-4 text-white/80 leading-relaxed whitespace-pre-wrap">
                  {result.brute_force}
                </TabsContent>
              </Tabs>
            </div>
            
            <CodeViewer code={result.code} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
