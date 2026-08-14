"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodebaseSearchDialog } from "@/components/repositories/codebase-search-dialog";
import { Search } from "lucide-react";

interface RepositorySearchButtonProps {
  repositoryId: string;
}

export function RepositorySearchButton({ repositoryId }: RepositorySearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border-zinc-700 font-mono text-xs h-9 px-3 gap-2 shadow-sm cursor-pointer shrink-0"
      >
        <Search className="h-3.5 w-3.5 text-amber-400" />
        <span>Search Codebase & AST...</span>
        <kbd className="hidden sm:inline-block rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-500 border border-zinc-800">
          Ctrl + K
        </kbd>
      </Button>

      <CodebaseSearchDialog
        repositoryId={repositoryId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
