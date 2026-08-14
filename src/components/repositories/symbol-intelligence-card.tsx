"use client";

import { useState, useMemo } from "react";
import { SymbolGraphSummary } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Code2,
  AlertTriangle,
  Search,
  X,
  ChevronRight,
  ArrowRight,
  Share2,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface SymbolIntelligenceCardProps {
  symbolSummary: SymbolGraphSummary;
  onSelectFilePath?: (filePath: string) => void;
}

export function SymbolIntelligenceCard({
  symbolSummary,
  onSelectFilePath,
}: SymbolIntelligenceCardProps) {
  const [activeModal, setActiveModal] = useState<"unused" | "top" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUnusedExports = useMemo(() => {
    if (!symbolSummary?.unusedExports) return [];
    if (!searchQuery.trim()) return symbolSummary.unusedExports;
    const q = searchQuery.toLowerCase().trim();
    return symbolSummary.unusedExports.filter(
      (item) =>
        item.symbol_name.toLowerCase().includes(q) ||
        item.defining_path.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
    );
  }, [symbolSummary, searchQuery]);

  const handleNavigateToFile = (path: string) => {
    setActiveModal(null);
    if (onSelectFilePath) {
      onSelectFilePath(path);
    } else {
      // Smooth scroll to file tree explorer
      const el = document.getElementById("file-tree-explorer-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Card className="border-amber-500/30 bg-amber-500/5 p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Symbol Definition & Usage Intelligence
            </h3>
          </div>
          {symbolSummary.unusedExportsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveModal("unused")}
              className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span>{symbolSummary.unusedExportsCount} Unused Export(s) &bull; View All &rarr;</span>
            </button>
          )}
        </div>

        {/* Every Metric Card is Clickable with Hover Effects */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono mb-4">
          {/* Defined Symbols Card */}
          <div
            onClick={() => setActiveModal("unused")}
            className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase group-hover:text-amber-400 transition-colors">
                Defined Symbols
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-amber-400 mt-0.5">
              {symbolSummary.totalDefinedSymbols}
            </p>
          </div>

          {/* Exported Symbols Card */}
          <div
            onClick={() => setActiveModal("unused")}
            className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase group-hover:text-emerald-400 transition-colors">
                Exported Symbols
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">
              {symbolSummary.exportedSymbolsCount}
            </p>
          </div>

          {/* Reference Edges Card */}
          <div
            onClick={() => setActiveModal("unused")}
            className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 hover:border-sky-500/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase group-hover:text-sky-400 transition-colors">
                Reference Edges
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-sky-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-sky-400 mt-0.5">
              {symbolSummary.symbolReferencesCount}
            </p>
          </div>

          {/* Unused Exports Card */}
          <div
            onClick={() => setActiveModal("unused")}
            className="rounded-lg bg-zinc-950 p-3 border border-rose-500/30 hover:border-rose-500/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase group-hover:text-rose-400 transition-colors">
                Unused Exports
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-rose-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-rose-400 mt-0.5">
              {symbolSummary.unusedExportsCount}
            </p>
          </div>
        </div>

        {/* Top Used Symbols Breakdown with Click Navigation */}
        {symbolSummary.topUsedSymbols.length > 0 && (
          <div className="pt-3 border-t border-amber-500/20">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
              Top Used Symbols Across Repository (Click to inspect file)
            </label>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {symbolSummary.topUsedSymbols.map((item) => (
                <button
                  type="button"
                  key={`${item.defining_path}:${item.symbol_name}`}
                  onClick={() => handleNavigateToFile(item.defining_path)}
                  className="inline-flex items-center gap-2 rounded bg-zinc-950 px-2.5 py-1 text-zinc-300 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-colors cursor-pointer group"
                >
                  <span className="font-semibold text-emerald-400 group-hover:underline">
                    {item.symbol_name}
                  </span>
                  <span className="text-zinc-500 text-[10px]">({item.defining_path})</span>
                  <span className="text-amber-400 font-bold">({item.usages_count} usages)</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Unused Exports Detail Modal */}
      {activeModal === "unused" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900/90">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-mono text-sm font-semibold text-zinc-100">
                    All Unused Exports ({symbolSummary.unusedExportsCount})
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Exported symbols defined in codebase but never imported anywhere.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Search Input */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter unused exports by symbol name or file path..."
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Modal Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs custom-scrollbar">
              {filteredUnusedExports.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  No unused exports matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredUnusedExports.map((item, idx) => (
                  <div
                    key={`${item.defining_path}:${item.symbol_name}:${idx}`}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-rose-300 text-sm">
                          {item.symbol_name}
                        </span>
                        <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400 border border-rose-500/20">
                          {item.kind}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{item.defining_path}</p>
                    </div>

                    <Button
                      onClick={() => handleNavigateToFile(item.defining_path)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] font-mono gap-1 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border-zinc-700 shrink-0 cursor-pointer"
                    >
                      <span>Inspect File</span>
                      <ArrowRight className="h-3 w-3 text-amber-400" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
