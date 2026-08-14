"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

export type ArchitectureMetricType =
  | "coupling"
  | "cohesion"
  | "modularity"
  | "instability";

interface ArchitectureMetricsModalProps {
  metricType: ArchitectureMetricType | null;
  onClose: () => void;
  couplingScore: number;
  cohesionScore: number;
  modularityScore: number;
  instabilityIndex: number;
}

const METRIC_DETAILS: Record<
  ArchitectureMetricType,
  {
    title: string;
    iconColor: string;
    badgeVariant: "emerald" | "amber" | "mono";
    tagline: string;
    definition: string;
    formula?: string;
    interpretation: string;
    whyItMatters: string;
    howToImprove: string[];
  }
> = {
  coupling: {
    title: "Coupling Score (Inter-Module Dependency)",
    iconColor: "text-sky-400",
    badgeVariant: "mono",
    tagline: "Measures how tightly connected code modules are to each other.",
    definition:
      "Coupling measures the degree of interdependence between software modules. High coupling means changes in one file ripple across many dependent files.",
    formula: "Coupling Score = 100 - (Avg Fan-Out * 8 + Layer Violations * 15)",
    interpretation:
      "A score of 80–100 indicates loose coupling with clear module boundaries. Lower scores highlight files that import too many internal paths or bypass architecture layers.",
    whyItMatters:
      "Tightly coupled codebases suffer from high change-impact blast radiuses — editing a single utility function can break unrelated components.",
    howToImprove: [
      "Use dependency injection or interface abstractions instead of importing concrete implementations.",
      "Consolidate scattered imports into clear domain modules.",
      "Extract shared types and utility helpers into decoupled library modules.",
    ],
  },
  cohesion: {
    title: "Cohesion Score (Single Responsibility)",
    iconColor: "text-emerald-400",
    badgeVariant: "emerald",
    tagline: "Measures how focused each module's internal responsibilities are.",
    definition:
      "Cohesion reflects how strongly related and focused the exports and functions within a single file are. High cohesion indicates a well-scoped module.",
    formula: "Cohesion Score = 100 - (Scattered Unused Exports * 4 + Oversized Files * 5)",
    interpretation:
      "High cohesion means every function and type in a file serves a single unified purpose, adhering to the Single Responsibility Principle (SRP).",
    whyItMatters:
      "Low cohesion leads to 'God objects' — bloated multi-thousand-line files that handle routing, data fetching, UI rendering, and business logic all in one place.",
    howToImprove: [
      "Split oversized files (>300 lines) into focused sub-modules.",
      "Remove unused exports to reduce module noise.",
      "Group related functions into domain-specific utility helpers.",
    ],
  },
  modularity: {
    title: "Modularity Score (Package & Layer Isolation)",
    iconColor: "text-purple-400",
    badgeVariant: "mono",
    tagline: "Evaluates circular dependencies and boundary violations.",
    definition:
      "Modularity evaluates how well your codebase strictly enforces package boundaries, prevents circular dependency loops, and isolates core business logic.",
    formula: "Modularity Score = 100 - (Circular Cycles * 25 + Unresolved Imports * 10)",
    interpretation:
      "A 100/100 score means zero circular dependency loops and clean module isolation across your directory tree.",
    whyItMatters:
      "Circular dependency loops break bundler tree-shaking, cause unexpected runtime undefined errors, and make code impossible to test in isolation.",
    howToImprove: [
      "Eliminate circular loops by extracting shared dependencies into a lower-level module.",
      "Enforce strict unidirectional data flow (e.g., UI -> Actions -> Services -> Database).",
      "Fix unresolved package imports.",
    ],
  },
  instability: {
    title: "Martin's Instability Index (I = Ce / (Ca + Ce))",
    iconColor: "text-amber-400",
    badgeVariant: "amber",
    tagline: "Robert C. Martin's metric measuring architectural resilience to change.",
    definition:
      "Instability (I) measures a module's susceptibility to change based on its Efferent Coupling (Ce = outgoing dependencies) and Afferent Coupling (Ca = incoming dependents).",
    formula: "Instability (I) = Efferent Coupling (Ce) / [ Afferent Coupling (Ca) + Efferent Coupling (Ce) ]",
    interpretation:
      "I = 0.0 (Maximal Stability): Many modules depend on this file, and it depends on none (e.g., core types/schemas). I = 1.0 (Maximal Instability): This file depends on many modules, but none depend on it (e.g., top-level page views).",
    whyItMatters:
      "Stable modules (low I) should be abstract and rarely change, while unstable modules (high I) should hold concrete UI/routing logic. Mixing stable and unstable roles creates fragile codebases.",
    howToImprove: [
      "Ensure core domain schemas and database clients have low Instability (I < 0.3).",
      "Keep top-level application pages and UI layouts at higher Instability (I > 0.7).",
      "Adhere to the Stable Dependencies Principle (SDP): Depend in the direction of stability.",
    ],
  },
};

export function ArchitectureMetricsModal({
  metricType,
  onClose,
  couplingScore,
  cohesionScore,
  modularityScore,
  instabilityIndex,
}: ArchitectureMetricsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (metricType) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [metricType, onClose]);

  if (!metricType) return null;

  const detail = METRIC_DETAILS[metricType];
  const currentScore =
    metricType === "coupling"
      ? couplingScore
      : metricType === "cohesion"
      ? cohesionScore
      : metricType === "modularity"
      ? modularityScore
      : instabilityIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
            <HelpCircle className={`h-5 w-5 ${detail.iconColor}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">{detail.title}</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{detail.tagline}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 mt-4">
          {/* Current Score Callout */}
          <div className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-4 border border-zinc-800/80 font-mono">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">
              Your Codebase Metric
            </span>
            <Badge variant={detail.badgeVariant} className="text-sm px-2.5 py-1 font-bold">
              {metricType === "instability" ? `I = ${currentScore}` : `${currentScore} / 100`}
            </Badge>
          </div>

          {/* Definition */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              What it measures
            </label>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{detail.definition}</p>
          </div>

          {/* Formula */}
          {detail.formula && (
            <div className="rounded-lg bg-zinc-900/40 p-3 border border-zinc-800/60 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 block mb-1 uppercase">
                Mathematical Metric Model
              </span>
              <code className="text-sky-300 text-[11px]">{detail.formula}</code>
            </div>
          )}

          {/* Why it Matters */}
          <div className="rounded-lg bg-purple-500/5 p-3.5 border border-purple-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 font-mono">
              <AlertCircle className="h-4 w-4 text-purple-400" />
              <span>Why This Matters</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{detail.whyItMatters}</p>
          </div>

          {/* How to Improve */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
              <span>Recommended Architecture Improvements</span>
            </label>
            <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
              {detail.howToImprove.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
