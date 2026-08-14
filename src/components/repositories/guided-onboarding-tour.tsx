"use client";

import { useState, useTransition } from "react";
import { generateOnboardingTourAction } from "@/app/repositories/actions";
import { RepositoryOnboardingTour, OnboardingTourStep } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Code2,
  FileCode,
  Sparkles,
  Loader2,
  X,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface GuidedOnboardingTourProps {
  repositoryId: string;
  repositoryName: string;
}

export function GuidedOnboardingTour({
  repositoryId,
  repositoryName,
}: GuidedOnboardingTourProps) {
  const [tour, setTour] = useState<RepositoryOnboardingTour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStartTour = () => {
    setError(null);
    if (tour) {
      setIsTourActive(true);
      setCurrentStepIndex(0);
      return;
    }

    startTransition(async () => {
      const res = await generateOnboardingTourAction(repositoryId);
      if (!res.success || !res.tour) {
        setError(res.error || "Failed to generate onboarding tour.");
      } else {
        setTour(res.tour);
        setIsTourActive(true);
        setCurrentStepIndex(0);
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

  const currentStep: OnboardingTourStep | null =
    tour && tour.steps[currentStepIndex] ? tour.steps[currentStepIndex] : null;

  return (
    <>
      {/* Onboarding Tour Trigger Card */}
      <Card className="border-indigo-500/30 bg-indigo-500/5 p-5 mb-8 font-sans">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 font-bold">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                5-Minute Guided Repository Onboarding Tour
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Answers &quot;Where should I start?&quot; with a 6-step interactive tour of core hubs, entry points, & schemas.
              </p>
            </div>
          </div>

          <Button
            onClick={handleStartTour}
            disabled={isPending}
            className="bg-indigo-500 hover:bg-indigo-400 text-zinc-950 font-bold text-xs h-9 px-4 shadow-lg gap-2 cursor-pointer font-mono shrink-0"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Tour...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-zinc-950" />
                <span>{tour ? "Resume 5-Min Tour" : "Start 5-Min Guided Tour"}</span>
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-3 text-xs text-rose-400 font-mono">
            ⚠️ {error}
          </div>
        )}
      </Card>

      {/* Interactive Step Modal */}
      {isTourActive && tour && currentStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4 sm:p-6 font-sans">
          <div className="w-full max-w-2xl rounded-2xl border border-indigo-500/40 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header & Progress */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="font-mono text-sm font-bold text-zinc-100">
                    Step {currentStep.stepNumber} of {tour.totalSteps}: {currentStep.title}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    RepoLens Guided Developer Onboarding Tour &bull; ~{tour.estimatedTimeMinutes} min
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTourActive(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Bar Line */}
            <div className="w-full bg-zinc-900 h-1.5">
              <div
                className="bg-indigo-400 h-1.5 transition-all duration-300"
                style={{
                  width: `${((currentStepIndex + 1) / tour.totalSteps) * 100}%`,
                }}
              />
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 font-mono text-xs overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Role Badge & Path */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] text-indigo-300 font-bold uppercase">
                    {currentStep.role}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Fan-In: {currentStep.fanIn} | Fan-Out: {currentStep.fanOut}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-100 text-xs truncate">
                    {currentStep.filePath}
                  </span>
                  <Button
                    onClick={() => {
                      setIsTourActive(false);
                      handleInspectFile(currentStep.filePath);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 shrink-0 cursor-pointer"
                  >
                    <span>Inspect File</span>
                    <ArrowRight className="h-3 w-3 text-indigo-400" />
                  </Button>
                </div>
              </div>

              {/* Why It Matters */}
              <div className="rounded-lg bg-indigo-500/10 p-3.5 border border-indigo-500/20 space-y-1">
                <label className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold block">
                  Why This Module Matters
                </label>
                <p className="text-zinc-200 leading-relaxed font-sans text-xs">
                  {currentStep.whyItMatters}
                </p>
              </div>

              {/* Key AST Symbols */}
              {currentStep.keySymbols.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                    Key AST Symbols Defined Here
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.keySymbols.map((sym, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded bg-zinc-900 px-2.5 py-1 text-zinc-300 border border-zinc-800"
                      >
                        <span className="font-semibold text-indigo-400">{sym.name}</span>
                        <span className="text-zinc-500 text-[10px]">({sym.kind})</span>
                        <span className="text-amber-400 text-[10px]">({sym.referenceCount} refs)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounded AI Explanation */}
              <div className="rounded-lg bg-zinc-900 p-3.5 border border-zinc-800 space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>Grounded AST Context Explanation</span>
                </label>
                <p className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                  {currentStep.aiExplanation}
                </p>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between font-mono">
              <Button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 disabled:opacity-30 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              <span className="text-[11px] text-zinc-500">
                Step {currentStepIndex + 1} of {tour.totalSteps}
              </span>

              {currentStepIndex < tour.totalSteps - 1 ? (
                <Button
                  onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                  size="sm"
                  className="bg-indigo-500 hover:bg-indigo-400 text-zinc-950 font-bold text-xs h-8 px-3.5 gap-1.5 cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={() => setIsTourActive(false)}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs h-8 px-3.5 gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete Tour</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
