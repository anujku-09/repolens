import Link from "next/link";
import { Code2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Left Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              RepoLens
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              — Codebase Intelligence Platform
            </span>
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/repositories" className="hover:underline">
              Repositories
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
            <span>&copy; {new Date().getFullYear()} RepoLens Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
