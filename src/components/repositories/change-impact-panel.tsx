"use client";

import { ChangeImpactResult, ImpactRisk } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  AlertTriangle,
  FileCode,
  Layers,
  Code2,
  Boxes,
  Globe,
  ArrowRight,
  Info,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

interface ChangeImpactPanelProps {
  impact: ChangeImpactResult;
  onInspectFile?: (filePath: string) => void;
}

function getRiskBadgeVariant(risk: ImpactRisk) {
  switch (risk) {
    case "critical":
      return { label: "CRITICAL RISK", bg: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
    case "high":
      return { label: "HIGH RISK", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    case "medium":
      return { label: "MEDIUM RISK", bg: "bg-sky-500/20 text-sky-300 border-sky-500/40" };
    default:
      return { label: "LOW RISK", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
  }
}

export function ChangeImpactPanel({ impact, onInspectFile }: ChangeImpactPanelProps) {
  const badgeConfig = getRiskBadgeVariant(impact.risk);

  const handleInspect = (filePath: string) => {
    if (onInspectFile) {
      onInspectFile(filePath);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("repolens:inspect-file", {
          detail: { filePath },
        })
      );
    }
  };

  return (
    <Card className="border-rose-500/30 bg-rose-500/5 p-5 space-y-6 shadow-xl font-sans">
      {/* Header & Target File Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rose-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-400" />
            <h3 className="text-base font-bold text-zinc-100">
              Change Impact Analysis & Blast Radius
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Target Module: <code className="text-rose-300 font-semibold">{impact.targetFile.path}</code>
          </p>
        </div>

        <div className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 ${badgeConfig.bg}`}>
          {impact.risk === "critical" || impact.risk === "high" ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{badgeConfig.label}</span>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Direct (L1)</span>
          <p className="text-lg font-bold text-rose-400 mt-0.5">{impact.stats.directCount}</p>
        </div>

        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Transitive</span>
          <p className="text-lg font-bold text-amber-400 mt-0.5">{impact.stats.transitiveCount}</p>
        </div>

        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Total Affected</span>
          <p className="text-lg font-bold text-zinc-100 mt-0.5">{impact.stats.totalAffectedCount}</p>
        </div>

        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Max Depth</span>
          <p className="text-lg font-bold text-purple-400 mt-0.5">{impact.stats.maxDepth} L</p>
        </div>

        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Components</span>
          <p className="text-lg font-bold text-sky-400 mt-0.5">{impact.affectedComponents.length}</p>
        </div>

        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase block">Routes</span>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">{impact.affectedRoutes.length}</p>
        </div>
      </div>

      {/* Explanations & Risk Reasons */}
      <div className="rounded-lg bg-zinc-950 p-4 border border-rose-500/20 space-y-2">
        <label className="text-[11px] font-mono text-rose-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span>Blast Radius Signals & Impact Reasons</span>
        </label>
        <ul className="space-y-1 font-mono text-xs text-zinc-300 list-disc list-inside">
          {impact.reasons.map((reason, idx) => (
            <li key={idx} className="leading-relaxed">
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Affected Files List (Direct vs Transitive) */}
      <div className="space-y-4">
        {/* Direct Level 1 Dependents */}
        <div>
          <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <FileCode className="h-4 w-4 text-rose-400" />
              <span>Direct Dependents (Level 1 Impact — {impact.directDependents.length})</span>
            </span>
          </label>

          {impact.directDependents.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 italic p-3 rounded bg-zinc-950 border border-zinc-800">
              No internal repository files directly import this module.
            </p>
          ) : (
            <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {impact.directDependents.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                      L1
                    </span>
                    <span className="text-zinc-200 truncate">{file.path}</span>
                  </div>

                  <Button
                    onClick={() => handleInspect(file.path)}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 shrink-0 cursor-pointer"
                  >
                    <span>Inspect File</span>
                    <ArrowRight className="h-3 w-3 text-rose-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transitive Dependents (Level 2+) */}
        {impact.transitiveDependents.length > 0 && (
          <div>
            <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <span>Transitive Downstream Ripple Effects (Depth 2+ — {impact.transitiveDependents.length})</span>
            </label>

            <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {impact.transitiveDependents.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                      L{file.depth}
                    </span>
                    <span className="text-zinc-300 truncate">{file.path}</span>
                  </div>

                  <Button
                    onClick={() => handleInspect(file.path)}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 shrink-0 cursor-pointer"
                  >
                    <span>Inspect File</span>
                    <ArrowRight className="h-3 w-3 text-amber-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Affected Symbols, Components & Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-rose-500/20 pt-4">
        {/* Affected Symbols */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Affected Symbols ({impact.affectedSymbols.length})</span>
          </label>
          <div className="space-y-1 font-mono text-xs max-h-36 overflow-y-auto custom-scrollbar">
            {impact.affectedSymbols.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No target symbols referenced.</p>
            ) : (
              impact.affectedSymbols.map((sym, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                  <span className="font-semibold text-amber-400 truncate">{sym.symbol_name}</span>
                  <span className="text-zinc-500 text-[10px]">({sym.reference_count} refs)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Affected React Components */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 text-sky-400" />
            <span>Affected Components ({impact.affectedComponents.length})</span>
          </label>
          <div className="space-y-1 font-mono text-xs max-h-36 overflow-y-auto custom-scrollbar">
            {impact.affectedComponents.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No React components in path.</p>
            ) : (
              impact.affectedComponents.map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                  <span className="font-semibold text-sky-300 truncate">{comp.name}</span>
                  <span className="text-zinc-500 text-[10px] truncate max-w-[120px]">{comp.path}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Affected Next.js Routes */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span>Affected Routes ({impact.affectedRoutes.length})</span>
          </label>
          <div className="space-y-1 font-mono text-xs max-h-36 overflow-y-auto custom-scrollbar">
            {impact.affectedRoutes.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No routes connected to module.</p>
            ) : (
              impact.affectedRoutes.map((route, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                  <span className="font-semibold text-emerald-400 font-mono">{route.route_path}</span>
                  <span className="text-zinc-500 text-[10px] truncate max-w-[120px]">{route.file_path}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Limitations Disclaimer Box (Requirement 13) */}
      <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 font-mono">
        <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-zinc-200 block">Static Analysis & Impact Boundary Disclaimer</span>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Results display <strong className="text-zinc-300">potentially affected</strong> files derived from AST static import references. Dynamic runtime imports (<code className="text-amber-400">import()</code>), reflection, environment variable toggles, and external microservices are not guaranteed to be captured by static trees.
          </p>
        </div>
      </div>
    </Card>
  );
}
