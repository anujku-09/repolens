"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildDependencyGraphAction } from "@/app/repositories/actions";
import { DependencyGraphSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { GitFork, Loader2, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface DependencyGraphButtonProps {
  repositoryId: string;
  isGraphBuilt: boolean;
  disabled?: boolean;
}

export function DependencyGraphButton({
  repositoryId,
  isGraphBuilt,
  disabled = false,
}: DependencyGraphButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<DependencyGraphSummary | null>(null);

  const handleBuild = async () => {
    setErrorMessage(null);
    setSummary(null);
    setIsLoading(true);

    try {
      const result = await buildDependencyGraphAction(repositoryId);

      if (!result.success) {
        setErrorMessage(
          result.error || "Failed to build repository dependency graph."
        );
      } else {
        if (result.summary) {
          setSummary(result.summary);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("[DependencyGraphButton Exception]:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during graph generation."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleBuild}
        disabled={isLoading || disabled}
        className="bg-purple-500 hover:bg-purple-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Building Dependency Graph...</span>
          </>
        ) : isGraphBuilt ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Rebuild Dependency Graph</span>
          </>
        ) : (
          <>
            <GitFork className="h-3.5 w-3.5 mr-1" />
            <span>Build Dependency Graph</span>
          </>
        )}
      </Button>

      {/* Summary Feedback Banner */}
      {summary && (
        <div className="space-y-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-400" />
            <p className="font-semibold text-zinc-100">Dependency Graph Built Successfully!</p>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-zinc-300 pt-1 border-t border-purple-500/20 font-mono">
            <div className="flex items-center justify-between">
              <span>Internal Edges:</span>
              <strong className="text-purple-400">{summary.internalDependencies}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>External Packages:</span>
              <strong className="text-sky-400">{summary.externalDependencies}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Unresolved / Cycles:</span>
              <strong className="text-amber-400">{summary.unresolvedDependencies} / {summary.circularDependencyCount}</strong>
            </div>
          </div>

          {summary.circularDependencyCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {summary.circularDependencyCount} circular reference cycle(s) detected in codebase.
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
            <p className="font-semibold font-sans">Graph Builder Error</p>
            <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
