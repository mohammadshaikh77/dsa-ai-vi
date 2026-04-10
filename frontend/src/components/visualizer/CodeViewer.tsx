import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeSnippets } from "@workspace/api-client-react";
import { Clock, Database, Copy, Check } from "lucide-react";

interface CodeViewerProps {
  code: CodeSnippets;
  timeComplexity?: string;
  spaceComplexity?: string;
}

export function CodeViewer({ code, timeComplexity, spaceComplexity }: CodeViewerProps) {
  const [language, setLanguage] = useState<"cpp" | "java">("cpp");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code[language]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-0 bg-black/40 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0d1117]">
        <h3 className="text-base font-semibold text-white">Implementation</h3>
        <Tabs value={language} onValueChange={(v) => setLanguage(v as "cpp" | "java")} className="w-[150px]">
          <TabsList className="w-full grid grid-cols-2 bg-black/50 border border-white/5 h-8">
            <TabsTrigger value="cpp" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">C++</TabsTrigger>
            <TabsTrigger value="java" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Java</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Code block */}
      <div className="relative group">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 border border-white/10 rounded px-2 py-1 flex items-center gap-1.5 text-xs text-white/70"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <pre className="p-5 bg-[#0d1117] overflow-x-auto text-sm font-mono text-gray-300 border-0 min-h-[120px] leading-relaxed">
          <code>{code[language]}</code>
        </pre>
      </div>

      {/* Complexity section */}
      {(timeComplexity || spaceComplexity) && (
        <div className="flex flex-col sm:flex-row border-t border-white/10">
          {timeComplexity && (
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-blue-950/20 border-r border-white/10">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/20 flex-shrink-0">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-blue-400/70 uppercase tracking-widest">Time Complexity</span>
                <span className="text-white font-mono font-bold text-sm mt-0.5">{timeComplexity}</span>
              </div>
            </div>
          )}
          {spaceComplexity && (
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-emerald-950/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex-shrink-0">
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest">Space Complexity</span>
                <span className="text-white font-mono font-bold text-sm mt-0.5">{spaceComplexity}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
