"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ingestRepositoryAction } from "@/app/repositories/actions";
import { Button } from "@/components/ui/button";
import { Database, Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface IngestButtonProps {
  repositoryId: string;
  isIndexed: boolean;
  isIndexing: boolean;
}

export function IngestButton({
  repositoryId,
  isIndexed,
  isIndexing,
}: IngestButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleIngest = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await ingestRepositoryAction(repositoryId);

      if (!result.success) {
        setErrorMessage(result.error || "Ingestion failed.");
      } else {
        router.refresh();
      }
    });
  };

  const loading = isPending || isIndexing;

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleIngest}
        disabled={loading}
        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            <span>Indexing File Tree...</span>
          </>
        ) : isIndexed ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Re-sync File Tree</span>
          </>
        ) : (
          <>
            <Database className="h-3.5 w-3.5 mr-1" />
            <span>Ingest Repository</span>
          </>
        )}
      </Button>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-mono">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
