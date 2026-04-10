import React from "react";
import { Link } from "wouter";
import { useGetAnalysisHistory, getGetAnalysisHistoryQueryKey, useDeleteAnalysis } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight, Activity, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  const { data: history, isLoading } = useGetAnalysisHistory({
    query: { enabled: true, queryKey: getGetAnalysisHistoryQueryKey() }
  });
  const deleteMutation = useDeleteAnalysis();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Analysis deleted" });
        queryClient.invalidateQueries({ queryKey: getGetAnalysisHistoryQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    });
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold neon-text mb-2">Analysis History</h1>
          <p className="text-muted-foreground">Review your past algorithm visualizations.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-xl border border-white/5">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No history yet</h3>
          <p className="text-muted-foreground mb-6">Start analyzing problems to see them here.</p>
          <Link href="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Analyze a Problem
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map((item) => (
            <Card key={item.id} className="glass-card border-white/10 hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg text-white/90 line-clamp-1 flex-1 pr-4" title={item.problem}>
                    {item.problem}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-2"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {item.pattern}
                    </Badge>
                    <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                      {item.difficulty}
                    </Badge>
                  </div>
                  <Link href={`/analyze/${item.id}`}>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
                      View <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
