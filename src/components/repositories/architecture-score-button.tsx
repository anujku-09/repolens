"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildArchitectureScoreAction } from "@/app/repositories/actions";
import { RepositoryArchitectureScore } from "@/types";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface ArchitectureScoreButtonProps {
  repositoryId: string;
  isScoreComputed: boolean;
  disabled?: boolean;
}

export function ArchitectureScoreButton({
  repositoryId,
  isScoreComputed,
  disabled = false,
}: ArchitectureScoreButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<RepositoryArchitectureScore | null>(null);

  const handleCompute = async () => {
    setErrorMessage(null);
    setScoreResult(null);
    setIsLoading(true);

    try {
      const result = await buildArchitectureScoreAction(repositoryId);

      if (!result.success) {
        setErrorMessage(
          result.error || "Failed to calculate codebase architecture health score."
        );
      } else {
        if (result.score) {
          setScoreResult(result.score);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("[ArchitectureScoreButton Exception]:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during architecture evaluation."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleCompute}
        disabled={isLoading || disabled}
        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Evaluating Architecture...</span>
          </>
        ) : isScoreComputed ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Re-calculate Score</span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            <span>Compute Architecture Score</span>
          </>
        )}
      </Button>

      {/* Summary Feedback Banner */}
      {scoreResult && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-mono space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <p className="font-semibold text-zinc-100">
              Architecture Evaluated! Overall Health Score:{" "}
              <strong className="text-emerald-400 font-bold text-sm">{scoreResult.health_score}/100</strong>
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold font-sans">Architecture Evaluator Error</p>
            <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
