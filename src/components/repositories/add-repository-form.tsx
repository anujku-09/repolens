"use client";

import { useState } from "react";
import { addRepositoryAction } from "@/app/repositories/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Loader2, AlertCircle, CheckCircle2, TestTube } from "lucide-react";

export function AddRepositoryForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await addRepositoryAction(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1500);
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-zinc-100 text-zinc-950 hover:bg-white font-semibold"
      >
        <Plus className="h-4 w-4" />
        <span>Add Repository</span>
      </Button>
    );
  }

  return (
    <Card className="border-emerald-500/30 bg-zinc-900/90 p-5 shadow-xl transition-all w-full max-w-lg">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <TestTube className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-xs font-semibold text-zinc-200">
            [Internal Test] Add Repository to Database
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 mb-3">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Repository created successfully in database!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="owner" className="text-[11px] font-medium text-zinc-300">
              Owner / Org *
            </label>
            <input
              id="owner"
              name="owner"
              type="text"
              required
              placeholder="e.g. vercel"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="name" className="text-[11px] font-medium text-zinc-300">
              Repository Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. next.js"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="language" className="text-[11px] font-medium text-zinc-300">
              Language
            </label>
            <input
              id="language"
              name="language"
              type="text"
              placeholder="e.g. TypeScript"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="description" className="text-[11px] font-medium text-zinc-300">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              placeholder="Short description..."
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="text-xs bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-semibold border-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              "Save to Database"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
