"use client";

import { useState, useEffect, useTransition } from "react";
import { searchCodebaseAction } from "@/app/repositories/actions";
import { CodebaseSearchResult, SymbolKind, CodebaseSearchFilters } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Code2,
  FileCode,
  ArrowRight,
  Loader2,
  Sparkles,
  Filter,
} from "lucide-react";

interface CodebaseSearchDialogProps {
  repositoryId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectFilePath?: (filePath: string) => void;
}

export function CodebaseSearchDialog({
  repositoryId,
  isOpen,
  onClose,
  onSelectFilePath,
}: CodebaseSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [symbolKind, setSymbolKind] = useState<SymbolKind | "all">("all");
  const [exportedOnly, setExportedOnly] = useState(false);
  const [searchResult, setSearchResult] = useState<CodebaseSearchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keyboard shortcut Ctrl+K to toggle search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Execute live search when query or filters change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startTransition(async () => {
        const filters: CodebaseSearchFilters = {
          symbolKind,
          exportedOnly,
        };
        const res = await searchCodebaseAction(repositoryId, query, filters);
        if (res.success && res.result) {
          setSearchResult(res.result);
        }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [repositoryId, query, symbolKind, exportedOnly, isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (filePath: string) => {
    onClose();
    if (onSelectFilePath) {
      onSelectFilePath(filePath);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("repolens:inspect-file", {
          detail: { filePath },
        })
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-zinc-950/80 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-3xl max-h-[80vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Search Bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center gap-3">
          <Search className="h-5 w-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AST symbols, components, files, or paths... (e.g. createClient, Button, server.ts)"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none font-mono"
          />
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Pills Bar */}
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500 text-[11px] flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3 text-zinc-400" />
            <span>Filter:</span>
          </span>

          {(["all", "function", "component", "class", "variable"] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              onClick={() => setSymbolKind(kind)}
              className={`px-2.5 py-1 rounded-md text-[11px] capitalize transition-colors cursor-pointer ${
                symbolKind === kind
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {kind}s
            </button>
          ))}

          <button
            type="button"
            onClick={() => setExportedOnly(!exportedOnly)}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
              exportedOnly
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            Exported Only
          </button>

          {searchResult && (
            <span className="ml-auto text-[11px] text-zinc-500">
              {searchResult.totalMatches} match(es)
            </span>
          )}
        </div>

        {/* Search Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar font-mono text-xs">
          {!searchResult ? (
            <div className="py-12 text-center text-zinc-500">
              Type to search AST symbol definitions, components, and files...
            </div>
          ) : (
            <>
              {/* Category 1: Matching Symbols */}
              {searchResult.matchingSymbols.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-amber-400" />
                      <span>AST Symbol Definitions ({searchResult.matchingSymbols.length})</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {searchResult.matchingSymbols.map((sym) => (
                      <div
                        key={sym.id}
                        onClick={() => handleNavigate(sym.defining_path)}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/40 hover:bg-zinc-900 transition-colors cursor-pointer group"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-amber-400 group-hover:underline text-sm">
                              {sym.symbol_name}
                            </span>
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                              {sym.symbol_kind}
                            </span>
                            {sym.is_exported && (
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                                exported
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">{sym.defining_path}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-amber-300 font-bold">
                            {sym.reference_count} usage(s)
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 cursor-pointer"
                          >
                            <span>Inspect File</span>
                            <ArrowRight className="h-3 w-3 text-amber-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Matching Files */}
              {searchResult.matchingFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                    <span className="flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-sky-400" />
                      <span>Matching Code Files ({searchResult.matchingFiles.length})</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {searchResult.matchingFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleNavigate(file.path)}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-sky-500/40 hover:bg-zinc-900 transition-colors cursor-pointer group"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <span className="font-semibold text-sky-300 group-hover:underline text-sm">
                            {file.path}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            {file.language && <span>Lang: {file.language}</span>}
                            <span>&bull; Fan-in: {file.fanIn}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 text-zinc-300 hover:text-zinc-100 border-zinc-700 shrink-0 cursor-pointer"
                        >
                          <span>Inspect File</span>
                          <ArrowRight className="h-3 w-3 text-sky-400" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResult.totalMatches === 0 && (
                <div className="py-12 text-center text-zinc-500">
                  No matching files or symbols found for &quot;{query}&quot;.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
