"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RepoLens Global Error Boundary]:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100 font-sans">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/80 p-6 text-center">
        <CardHeader className="p-0 mb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-3">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Application Error</CardTitle>
          <CardDescription className="text-zinc-400 mt-1">
            An unexpected exception occurred while rendering this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-2 space-y-4">
          <div className="rounded bg-zinc-950 p-3 font-mono text-xs text-rose-400/90 text-left overflow-x-auto border border-zinc-800">
            {error.message || "Unknown error"}
          </div>
          <Button onClick={reset} className="w-full gap-2 bg-zinc-100 text-zinc-900 hover:bg-white">
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
