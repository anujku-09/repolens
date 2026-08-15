"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArchitectureMetricsModal,
  ArchitectureMetricType,
} from "@/components/repositories/architecture-metrics-modal";
import {
  ShieldCheck,
  AlertTriangle,
  FileX,
  HelpCircle,
} from "lucide-react";
import { RepositoryArchitectureScore, LayerViolation, OrphanFile } from "@/types";

interface ArchitectureHealthCardProps {
  archScore: RepositoryArchitectureScore | null;
  isScoreComputed: boolean;
}

export function ArchitectureHealthCard({
  archScore,
  isScoreComputed,
}: ArchitectureHealthCardProps) {
  const [activeMetricModal, setActiveMetricModal] =
    useState<ArchitectureMetricType | null>(null);

  if (!isScoreComputed || !archScore) {
    return (
      <Card className="border-zinc-800/80 bg-zinc-900/30 p-5 mb-5 text-center font-mono">
        <div className="flex flex-col items-center justify-center py-4">
          <ShieldCheck className="h-8 w-8 text-zinc-600 mb-2" />
          <h3 className="text-sm font-semibold text-zinc-300">
            Architecture Score Pending
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mt-1">
            Click &quot;Re-calculate Score&quot; in step 5 of the Pipeline Control
            bar above to calculate coupling, cohesion, modularity, and layer
            violations.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-emerald-500/30 bg-emerald-500/5 p-5 mb-5 font-sans">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xl shadow-inner">
              {archScore.health_score}
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <span>Architecture Quality & Health Dashboard</span>
                <Badge
                  variant={
                    archScore.health_score >= 80
                      ? "emerald"
                      : archScore.health_score >= 60
                      ? "amber"
                      : "rose"
                  }
                  className="font-mono text-xs"
                >
                  {archScore.health_score >= 80
                    ? "Excellent Modularity"
                    : archScore.health_score >= 60
                    ? "Moderate Quality"
                    : "High Risk Architecture"}
                </Badge>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Evaluated across {archScore.total_files_evaluated} code files
                with Martin&apos;s Instability Index ({archScore.instability_index || 0.5}).
              </p>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 bg-zinc-950/60 px-3 py-1.5 rounded-lg border border-zinc-800">
            <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Click any metric card below to inspect definition & formula</span>
          </span>
        </div>

        {/* 4 Interactive Sub-Scores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono mb-6">
          {/* Coupling Card */}
          <div
            onClick={() => setActiveMetricModal("coupling")}
            className="group rounded-lg bg-zinc-950 p-3.5 border border-zinc-800 hover:border-sky-500/50 hover:bg-sky-500/5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider group-hover:text-sky-400 transition-colors">
                Coupling Score
              </span>
              <HelpCircle className="h-3.5 w-3.5 text-zinc-600 group-hover:text-sky-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-sky-400 mt-1">
              {archScore.coupling_score}/100
            </p>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors mt-0.5 block">
              Click for breakdown &rarr;
            </span>
          </div>

          {/* Cohesion Card */}
          <div
            onClick={() => setActiveMetricModal("cohesion")}
            className="group rounded-lg bg-zinc-950 p-3.5 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                Cohesion Score
              </span>
              <HelpCircle className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {archScore.cohesion_score}/100
            </p>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors mt-0.5 block">
              Click for breakdown &rarr;
            </span>
          </div>

          {/* Modularity Card */}
          <div
            onClick={() => setActiveMetricModal("modularity")}
            className="group rounded-lg bg-zinc-950 p-3.5 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider group-hover:text-purple-400 transition-colors">
                Modularity Score
              </span>
              <HelpCircle className="h-3.5 w-3.5 text-zinc-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-purple-400 mt-1">
              {archScore.modularity_score}/100
            </p>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors mt-0.5 block">
              Click for breakdown &rarr;
            </span>
          </div>

          {/* Instability Index Card */}
          <div
            onClick={() => setActiveMetricModal("instability")}
            className="group rounded-lg bg-zinc-950 p-3.5 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                Avg Instability (I)
              </span>
              <HelpCircle className="h-3.5 w-3.5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-xl font-bold text-amber-400 mt-1">
              {archScore.instability_index || 0.5}
            </p>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors mt-0.5 block">
              Click for breakdown &rarr;
            </span>
          </div>
        </div>

        {/* Layer Violations Warning List */}
        {archScore.analysis_payload?.layerViolations?.length > 0 && (
          <div className="pt-3 border-t border-emerald-500/20 mb-4">
            <label className="text-[11px] font-mono text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>
                Layer Violations Detected ({archScore.layer_violations_count})
              </span>
            </label>
            <div className="space-y-1.5 font-mono text-xs">
              {archScore.analysis_payload.layerViolations.map((v: LayerViolation, idx: number) => (
                <div
                  key={idx}
                  className="rounded bg-zinc-950 p-2.5 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-400 text-[11px]">
                      {v.violationType}
                    </span>
                    <p className="text-[11px] text-zinc-300">
                      <code className="text-sky-300">{v.sourcePath}</code> &rarr;{" "}
                      <code className="text-rose-300">{v.targetPath}</code>
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-500 italic max-w-xs">
                    {v.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orphan Files List */}
        {archScore.analysis_payload?.orphanFiles?.length > 0 && (
          <div className="pt-3 border-t border-emerald-500/20">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <FileX className="h-3.5 w-3.5 text-purple-400" />
              <span>
                Orphan / Unreachable Code Files ({archScore.orphan_files_count})
              </span>
            </label>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {archScore.analysis_payload.orphanFiles.slice(0, 8).map((orphan: OrphanFile) => (
                <div
                  key={orphan.path}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("repolens:inspect-file", {
                        detail: { filePath: orphan.path },
                      })
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded bg-zinc-950 px-2.5 py-1 text-purple-300 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/10 cursor-pointer transition-colors"
                >
                  <span>{orphan.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Explainer Modal */}
      <ArchitectureMetricsModal
        metricType={activeMetricModal}
        onClose={() => setActiveMetricModal(null)}
        couplingScore={archScore.coupling_score}
        cohesionScore={archScore.cohesion_score}
        modularityScore={archScore.modularity_score}
        instabilityIndex={archScore.instability_index || 0.5}
      />
    </>
  );
}
