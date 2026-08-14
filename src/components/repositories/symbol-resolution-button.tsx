"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildRepositorySymbolsAction } from "@/app/repositories/actions";
import { SymbolGraphSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Code2, Loader2, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface SymbolResolutionButtonProps {
  repositoryId: string;
  isSymbolsResolved: boolean;
  disabled?: boolean;
}

export function SymbolResolutionButton({
  repositoryId,
  isSymbolsResolved,
  disabled = false,
}: SymbolResolutionButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<SymbolGraphSummary | null>(null);

  const handleResolve = async () => {
    setErrorMessage(null);
    setSummary(null);
    setIsLoading(true);

    try {
      const result = await buildRepositorySymbolsAction(repositoryId);

      if (!result.success) {
        setErrorMessage(
          result.error || "Failed to resolve symbol definitions and cross-file usages."
        );
      } else {
        if (result.summary) {
          setSummary(result.summary);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("[SymbolResolutionButton Exception]:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during symbol resolution."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleResolve}
        disabled={isLoading || disabled}
        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Resolving Symbols...</span>
          </>
        ) : isSymbolsResolved ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Re-resolve Symbols</span>
          </>
        ) : (
          <>
            <Code2 className="h-3.5 w-3.5 mr-1" />
            <span>Resolve Symbols & Usages</span>
          </>
        )}
      </Button>

      {/* Summary Feedback Banner */}
      {summary && (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="font-semibold text-zinc-100">Symbol Graph Resolved Successfully!</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-300 pt-1 border-t border-amber-500/20">
            <span>
              Defined Symbols: <strong>{summary.totalDefinedSymbols}</strong>
            </span>
            <span>
              Exported: <strong>{summary.exportedSymbolsCount}</strong>
            </span>
            <span>
              Reference Edges: <strong>{summary.symbolReferencesCount}</strong>
            </span>
            <span>
              Unused Exports: <strong>{summary.unusedExportsCount}</strong>
            </span>
          </div>

          {summary.unusedExportsCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {summary.unusedExportsCount} exported symbol(s) defined but never imported anywhere.
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
            <p className="font-semibold font-sans">Symbol Resolver Error</p>
            <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
