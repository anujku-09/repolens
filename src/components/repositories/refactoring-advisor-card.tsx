"use client";

import { useState, useTransition, useMemo } from "react";
import { generateRefactoringReportAction } from "@/app/repositories/actions";
import { RefactoringAdvisorReport, RecommendationPriority, RefactoringRecommendation } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  AlertTriangle,
  Flame,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Filter,
  Info,
  ShieldAlert,
  FileCode,
} from "lucide-react";

interface RefactoringAdvisorCardProps {
  repositoryId: string;
}

function getPriorityBadgeStyle(priority: RecommendationPriority) {
  switch (priority) {
    case "critical":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    case "high":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "medium":
      return "bg-sky-500/20 text-sky-300 border-sky-500/40";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}

export function RefactoringAdvisorCard({ repositoryId }: RefactoringAdvisorCardProps) {
  const [report, setReport] = useState<RefactoringAdvisorReport | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<RecommendationPriority | "all">("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateRefactoringReportAction(repositoryId);
      if (!res.success || !res.report) {
        setError(res.error || "Failed to generate refactoring report.");
      } else {
        setReport(res.report);
      }
    });
  };

  const handleInspectFile = (filePath: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("repolens:inspect-file", {
          detail: { filePath },
        })
      );
    }
  };

  const filteredRecommendations = useMemo(() => {
    if (!report) return [];
    if (priorityFilter === "all") return report.recommendations;
    return report.recommendations.filter((r) => r.priority === priorityFilter);
  }, [report, priorityFilter]);

  return (
    <Card className="border-purple-500/30 bg-purple-500/5 p-5 mb-8 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              Architecture & Refactoring Advisor
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              Answers &quot;What should I refactor first?&quot; by ranking high-impact architecture debt & coupling risks.
            </p>
          </div>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={isPending}
          className="bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold text-xs h-9 px-4 shadow-lg gap-2 cursor-pointer font-mono shrink-0"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing Debt...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{report ? "Re-evaluate Refactoring Debt" : "Evaluate Refactoring Priorities"}</span>
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-400 font-mono">
          ⚠️ {error}
        </div>
      )}

      {/* Generated Refactoring Report */}
      {report && (
        <div className="mt-5 space-y-5">
          {/* Header Summary Bar & Priority Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-3 text-zinc-300">
              <span className="text-emerald-400 font-bold">
                Health Score: {report.healthScore ?? "N/A"}/100
              </span>
              <span>&bull;</span>
              <span className="text-purple-300 font-bold">
                {report.totalIssuesFound} Prioritized Refactoring Targets
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Filter className="h-3 w-3 text-zinc-400" />
              <span className="text-zinc-500 text-[11px] mr-1">Filter Priority:</span>
              {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer ${
                    priorityFilter === p
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4 font-mono text-xs">
            {filteredRecommendations.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No refactoring recommendations matching priority filter.
              </div>
            ) : (
              filteredRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 hover:border-purple-500/40 transition-colors"
                >
                  {/* Card Title & Priority Badge */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${getPriorityBadgeStyle(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-zinc-400 text-[11px] capitalize bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {rec.category.replace(/_/g, " ")}
                      </span>
                      <h4 className="font-semibold text-zinc-100 text-sm font-sans">
                        {rec.title}
                      </h4>
                    </div>

                    {rec.affectedPath !== "Repository File Tree" && rec.affectedPath !== "Repository Symbol Graph" && (
                      <Button
                        onClick={() => handleInspectFile(rec.affectedPath)}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 shrink-0 cursor-pointer"
                      >
                        <span>Inspect File</span>
                        <ArrowRight className="h-3 w-3 text-purple-400" />
                      </Button>
                    )}
                  </div>

                  {/* Affected Module Path */}
                  <div className="text-[11px]">
                    <span className="text-zinc-500 uppercase">Target Module:</span>{" "}
                    <code className="text-purple-300 font-semibold">{rec.affectedPath}</code>
                  </div>

                  {/* 3-Column Evidence, Impact & Suggested Refactor Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* Evidence Box */}
                    <div className="rounded bg-zinc-900/80 p-3 border border-zinc-800 space-y-1">
                      <span className="text-[10px] text-amber-300 uppercase tracking-wider font-bold block flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Detected Evidence</span>
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {rec.evidence}
                      </p>
                    </div>

                    {/* Potential Impact Box */}
                    <div className="rounded bg-zinc-900/80 p-3 border border-zinc-800 space-y-1">
                      <span className="text-[10px] text-rose-300 uppercase tracking-wider font-bold block flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Potential System Impact</span>
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {rec.potentialImpact}
                      </p>
                    </div>

                    {/* Suggested Refactoring Strategy */}
                    <div className="rounded bg-zinc-900/80 p-3 border border-purple-500/20 space-y-1">
                      <span className="text-[10px] text-purple-300 uppercase tracking-wider font-bold block flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        <span>Suggested Refactor Strategy</span>
                      </span>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        {rec.suggestedRefactor}
                      </p>
                    </div>
                  </div>

                  {/* Grounded AI Explanation Layer */}
                  <div className="rounded bg-zinc-900/40 p-2.5 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>{rec.aiExplanation}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Disclaimer Box */}
          <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 font-mono">
            <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-zinc-400">
              <strong className="text-zinc-200">Refactoring Advisor Disclaimer</strong>: Recommendations represent algorithmic guidance derived from static graph coupling ratios and AST facts. Suggested refactors are non-breaking guidance, not guaranteed runtime fixes.
            </p>
          </div>
        </div>
      )}

      {!report && !isPending && (
        <div className="mt-3 text-center py-4 text-xs font-mono text-zinc-500">
          Click <strong>&quot;Evaluate Refactoring Priorities&quot;</strong> to analyze codebase coupling, circular loops, and high-impact refactoring targets.
        </div>
      )}
    </Card>
  );
}
