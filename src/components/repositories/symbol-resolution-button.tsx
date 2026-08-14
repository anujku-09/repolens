"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildRepositorySymbolsAction } from "@/app/repositories/actions";
import { SymbolGraphSummary } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Code2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

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
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<SymbolGraphSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResolve = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await buildRepositorySymbolsAction(repositoryId);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.summary) {
          setSummary(res.summary);
          router.refresh();
        }
      } catch (err) {
        console.error("[handleResolve Error]:", err);
        setErrorMessage("Failed to resolve repository symbols.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleResolve}
        disabled={isLoading || isPending || disabled}
        className="w-full justify-center bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isLoading || isPending ? (
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
        <div className="flex flex-col justify-between min-h-[120px] rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="font-semibold text-zinc-100">Symbol Graph Resolved!</p>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-zinc-300 pt-1.5 border-t border-amber-500/20 font-mono">
            <div className="flex items-center justify-between">
              <span>Defined Symbols:</span>
              <strong className="text-amber-400">{summary.totalDefinedSymbols}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Exported Symbols:</span>
              <strong className="text-emerald-400">{summary.exportedSymbolsCount}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Reference Edges:</span>
              <strong className="text-sky-400">{summary.symbolReferencesCount}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Unused Exports:</span>
              <strong className="text-rose-400">{summary.unusedExportsCount}</strong>
            </div>
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
            <p className="font-semibold">Symbol Resolver Error</p>
            <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
