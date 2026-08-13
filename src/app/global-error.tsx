"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RepoLens Root Unhandled Exception]:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full dark">
      <body className="flex min-h-full items-center justify-center bg-zinc-950 px-4 text-zinc-100 font-sans">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Fatal System Error</h1>
          <p className="text-sm text-zinc-400 mb-6">
            A critical error occurred in the root layout.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Reset Application
          </button>
        </div>
      </body>
    </html>
  );
}
