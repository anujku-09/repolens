"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeRepositoryAction } from "@/app/repositories/actions";
import { RepositoryAnalysisSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Cpu, Loader2, RefreshCw, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface AstAnalyzeButtonProps {
  repositoryId: string;
  isAnalyzed: boolean;
  disabled?: boolean;
}

export function AstAnalyzeButton({
  repositoryId,
  isAnalyzed,
  disabled = false,
}: AstAnalyzeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<RepositoryAnalysisSummary | null>(null);

  const handleAnalyze = async () => {
    setErrorMessage(null);
    setSummary(null);
    setIsLoading(true);

    try {
      const result = await analyzeRepositoryAction(repositoryId);

      if (!result.success) {
        setErrorMessage(
          result.error || "AST code structure analysis failed. Check your Supabase database table."
        );
      } else {
        if (result.summary) {
          setSummary(result.summary);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("[AstAnalyzeButton Exception]:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during AST analysis."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAnalyze}
        disabled={isLoading || disabled}
        className="w-full justify-center bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Analyzing Code...</span>
          </>
        ) : isAnalyzed ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Re-analyze Structure</span>
          </>
        ) : (
          <>
            <Cpu className="h-3.5 w-3.5 mr-1" />
            <span>Analyze Code Structure</span>
          </>
        )}
      </Button>

      {/* Summary Feedback Banner */}
      {summary && (
        <div className="space-y-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
            <p className="font-semibold text-zinc-100">AST Analysis Complete!</p>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-zinc-300 pt-1 border-t border-sky-500/20 font-mono">
            <div className="flex items-center justify-between">
              <span>Analyzed Files:</span>
              <strong className="text-sky-400">{summary.analyzedFiles}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Imports / Exports:</span>
              <strong className="text-zinc-200">{summary.imports} / {summary.exports}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Functions / Classes:</span>
              <strong className="text-emerald-400">{summary.functions} / {summary.classes}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>React Components:</span>
              <strong className="text-amber-400">{summary.components}</strong>
            </div>
          </div>

          {summary.unsupportedLanguages.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pt-1">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>
                {summary.unsupportedLanguages.join(", ")}: AST parser not available yet
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Analysis Error</p>
            <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
