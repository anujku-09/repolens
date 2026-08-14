"use client";

import { useState, useMemo } from "react";
import { DependencyGraphSummary } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitFork,
  Package,
  AlertTriangle,
  Search,
  X,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";

interface DependencyMetricsCardProps {
  summary: DependencyGraphSummary;
}

export function DependencyMetricsCard({ summary }: DependencyMetricsCardProps) {
  const [activeModal, setActiveModal] = useState<"packages" | "cycles" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPackages = useMemo(() => {
    if (!summary?.externalPackages) return [];
    if (!searchQuery.trim()) return summary.externalPackages;
    const q = searchQuery.toLowerCase().trim();
    return summary.externalPackages.filter((pkg) => pkg.name.toLowerCase().includes(q));
  }, [summary, searchQuery]);

  return (
    <>
      <Card className="border-purple-500/30 bg-purple-500/5 p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Dependency Intelligence Metrics
            </h3>
          </div>
          {summary.circularDependencyCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveModal("cycles")}
              className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span>{summary.circularDependencyCount} Circular Reference Cycle(s) &bull; View &rarr;</span>
            </button>
          )}
        </div>

        {/* Clickable Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono mb-4">
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 transition-colors">
            <span className="text-[11px] text-zinc-500 uppercase">Internal Dependencies</span>
            <p className="text-xl font-bold text-purple-400 mt-0.5">
              {summary.internalDependencies}
            </p>
          </div>

          {/* Clickable External Packages Card */}
          <div
            onClick={() => setActiveModal("packages")}
            className="rounded-lg bg-zinc-950 p-3 border border-sky-500/30 hover:border-sky-500/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase group-hover:text-sky-400 transition-colors">
                External Packages
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-sky-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-sky-400 mt-0.5">
              {summary.externalDependencies}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 transition-colors">
            <span className="text-[11px] text-zinc-500 uppercase">Unresolved Imports</span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">
              {summary.unresolvedDependencies}
            </p>
          </div>

          {/* Clickable Circular Cycles Card */}
          <div
            onClick={() => {
              if (summary.circularDependencyCount > 0) setActiveModal("cycles");
            }}
            className={`rounded-lg bg-zinc-950 p-3 border transition-colors ${
              summary.circularDependencyCount > 0
                ? "border-rose-500/40 hover:border-rose-500/70 cursor-pointer group"
                : "border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase">Circular Cycles</span>
              {summary.circularDependencyCount > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-rose-400 transition-colors" />
              )}
            </div>
            <p className="text-xl font-bold text-rose-400 mt-0.5">
              {summary.circularDependencyCount}
            </p>
          </div>
        </div>

        {/* Top External Packages Preview */}
        {summary.externalPackages.length > 0 && (
          <div className="pt-3 border-t border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-sky-400" />
                <span>External Package Dependencies ({summary.externalPackages.length})</span>
              </label>

              <button
                type="button"
                onClick={() => setActiveModal("packages")}
                className="text-[11px] font-mono text-sky-400 hover:underline cursor-pointer"
              >
                View All {summary.externalPackages.length} Packages &rarr;
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {summary.externalPackages.slice(0, 10).map((pkg) => (
                <div
                  key={pkg.name}
                  onClick={() => setActiveModal("packages")}
                  className="inline-flex items-center gap-2 rounded bg-zinc-950 px-2.5 py-1 text-sky-300 border border-zinc-800 hover:border-sky-500/40 cursor-pointer transition-colors"
                >
                  <span className="font-semibold">{pkg.name}</span>
                  <span className="text-zinc-500">({pkg.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* External Package Dependencies Modal */}
      {activeModal === "packages" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900/90">
              <div className="flex items-center gap-2.5">
                <Package className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="font-mono text-sm font-semibold text-zinc-100">
                    All External Packages ({summary.externalPackages.length})
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    NPM package dependencies imported across repository source code.
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
                  placeholder="Filter package name..."
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Modal Items Grid */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
              {filteredPackages.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  No packages matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredPackages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60"
                    >
                      <span className="font-semibold text-sky-300 truncate">{pkg.name}</span>
                      <span className="bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded text-sky-400 font-bold shrink-0">
                        {pkg.count} imports
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Circular Dependency Cycles Modal */}
      {activeModal === "cycles" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden font-sans">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900/90">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-mono text-sm font-semibold text-zinc-100">
                    Circular Dependency Cycles ({summary.circularDependencyCount})
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Circular import loops detected in repository.
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

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs custom-scrollbar">
              {summary.circularCycles?.map((cycle, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1.5"
                >
                  <span className="font-bold text-amber-400">Cycle #{idx + 1}:</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-zinc-200">
                    {cycle.map((file, fIdx) => (
                      <span key={fIdx} className="flex items-center gap-1.5">
                        <code className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-sky-300">
                          {file}
                        </code>
                        {fIdx < cycle.length - 1 && <span className="text-amber-400">&rarr;</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
