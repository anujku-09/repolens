"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ingestRepositorySourceAction } from "@/app/repositories/actions";
import { SourceIngestionSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Code2, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface SourceIngestButtonProps {
  repositoryId: string;
  isIngested: boolean;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SourceIngestButton({
  repositoryId,
  isIngested,
  disabled = false,
}: SourceIngestButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<SourceIngestionSummary | null>(null);

  const handleIngestSource = () => {
    setErrorMessage(null);
    setSummary(null);

    startTransition(async () => {
      const result = await ingestRepositorySourceAction(repositoryId);

      if (!result.success) {
        setErrorMessage(result.error || "Source code ingestion failed.");
      } else {
        if (result.summary) {
          setSummary(result.summary);
        }
        if (result.error) {
          // Partial rate limit warning
          setErrorMessage(result.error);
        }
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleIngestSource}
        disabled={isPending || disabled}
        className="w-full justify-center bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Reading Source Code...</span>
          </>
        ) : isIngested ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Re-sync Source Code</span>
          </>
        ) : (
          <>
            <Code2 className="h-3.5 w-3.5 mr-1" />
            <span>Ingest Source Code</span>
          </>
        )}
      </Button>

      {/* Summary Feedback Banner */}
      {summary && (
        <div className="flex flex-col justify-between min-h-[120px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <p className="font-semibold text-zinc-100">Source Ingested Successfully!</p>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-zinc-300 pt-1.5 border-t border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span>Ingested Files:</span>
              <strong className="text-emerald-400">{summary.ingestedFiles}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Skipped Files:</span>
              <strong className="text-zinc-400">{summary.skippedFiles}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Code Size:</span>
              <strong className="text-emerald-300">{formatBytes(summary.totalBytes)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Error / Warning Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
