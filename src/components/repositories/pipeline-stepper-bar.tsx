"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { SourceIngestButton } from "@/components/repositories/source-ingest-button";
import { AstAnalyzeButton } from "@/components/repositories/ast-analyze-button";
import { DependencyGraphButton } from "@/components/repositories/dependency-graph-button";
import { SymbolResolutionButton } from "@/components/repositories/symbol-resolution-button";
import { ArchitectureScoreButton } from "@/components/repositories/architecture-score-button";
import {
  FileCode,
  Cpu,
  GitFork,
  Code2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface PipelineStepperBarProps {
  repositoryId: string;
  isIndexed: boolean;
  isSourceIngested: boolean;
  sourceCount: number;
  isAstAnalyzed: boolean;
  analyzedFilesCount?: number;
  isGraphBuilt: boolean;
  edgesCount?: number;
  isSymbolsResolved: boolean;
  totalDefinedSymbols?: number;
  isScoreComputed: boolean;
  healthScore?: number;
}

export function PipelineStepperBar({
  repositoryId,
  isIndexed,
  isSourceIngested,
  sourceCount,
  isAstAnalyzed,
  analyzedFilesCount,
  isGraphBuilt,
  edgesCount,
  isSymbolsResolved,
  totalDefinedSymbols,
  isScoreComputed,
  healthScore,
}: PipelineStepperBarProps) {
  const steps = [
    {
      id: 1,
      title: "1. Source",
      icon: FileCode,
      iconColor: "text-emerald-400",
      statusText: isSourceIngested ? `Indexed (${sourceCount})` : "Pending",
      isComplete: isSourceIngested,
      button: (
        <SourceIngestButton
          repositoryId={repositoryId}
          isIngested={isSourceIngested}
          disabled={!isIndexed}
        />
      ),
    },
    {
      id: 2,
      title: "2. AST Analysis",
      icon: Cpu,
      iconColor: "text-sky-400",
      statusText: isAstAnalyzed ? `Analyzed (${analyzedFilesCount || 0})` : "Pending",
      isComplete: isAstAnalyzed,
      button: (
        <AstAnalyzeButton
          repositoryId={repositoryId}
          isAnalyzed={isAstAnalyzed}
          disabled={!isSourceIngested}
        />
      ),
    },
    {
      id: 3,
      title: "3. Graph",
      icon: GitFork,
      iconColor: "text-purple-400",
      statusText: isGraphBuilt ? `Resolved (${edgesCount || 0})` : "Pending",
      isComplete: isGraphBuilt,
      button: (
        <DependencyGraphButton
          repositoryId={repositoryId}
          isGraphBuilt={isGraphBuilt}
          disabled={!isAstAnalyzed}
        />
      ),
    },
    {
      id: 4,
      title: "4. Symbols",
      icon: Code2,
      iconColor: "text-amber-400",
      statusText: isSymbolsResolved ? `Mapped (${totalDefinedSymbols || 0})` : "Pending",
      isComplete: isSymbolsResolved,
      button: (
        <SymbolResolutionButton
          repositoryId={repositoryId}
          isSymbolsResolved={isSymbolsResolved}
          disabled={!isGraphBuilt}
        />
      ),
    },
    {
      id: 5,
      title: "5. Health Score",
      icon: ShieldCheck,
      iconColor: "text-emerald-400",
      statusText: isScoreComputed ? `Score: ${healthScore}/100` : "Pending",
      isComplete: isScoreComputed,
      button: (
        <ArchitectureScoreButton
          repositoryId={repositoryId}
          isScoreComputed={isScoreComputed}
          disabled={!isGraphBuilt}
        />
      ),
    },
  ];

  return (
    <div className="w-full mb-8 font-sans">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2.5 px-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              RepoLens Codebase Intelligence Pipeline
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500">
            5 Automated Analysis Engines
          </span>
        </div>

        {/* 5-Step Horizontal Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-stretch">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex flex-col h-full rounded-lg p-3 border transition-all ${
                  step.isComplete
                    ? "bg-zinc-950/80 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                    : "bg-zinc-950/40 border-zinc-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${step.iconColor}`} />
                    <span className="text-xs font-bold text-zinc-200 font-mono">
                      {step.title}
                    </span>
                  </div>
                  {step.isComplete ? (
                    <Badge variant="emerald" className="font-mono text-[9px] px-1.5 py-0 flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>{step.statusText}</span>
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[9px] text-zinc-500 px-1.5 py-0">
                      {step.statusText}
                    </Badge>
                  )}
                </div>

                <div className="mt-auto pt-2.5 border-t border-zinc-800/60">
                  {step.button}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
