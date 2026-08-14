"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildDependencyGraphAction } from "@/app/repositories/actions";
import { DependencyGraphSummary } from "@/types";
import { Button } from "@/components/ui/button";
import {
  GitFork,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

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
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<DependencyGraphSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBuildGraph = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await buildDependencyGraphAction(repositoryId);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.summary) {
          setSummary(res.summary);
          router.refresh();
        }
      } catch (err) {
        console.error("[handleBuildGraph Error]:", err);
        setErrorMessage("Failed to resolve repository dependency graph.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleBuildGraph}
        disabled={isLoading || isPending || disabled}
        className="w-full justify-center bg-purple-500 hover:bg-purple-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isLoading || isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Resolving Graph...</span>
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
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2 text-xs text-purple-300 font-mono space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-400" />
            <p className="font-semibold text-zinc-100">Dependency Graph Built!</p>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-zinc-300 pt-1.5 border-t border-purple-500/20 font-mono">
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
                {summary.circularDependencyCount} circular reference cycle(s) detected.
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
            <p className="font-semibold">Graph Builder Error</p>
            <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
