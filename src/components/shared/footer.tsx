import Link from "next/link";
import { RepoLensLogo } from "@/components/shared/repolens-logo";

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-8 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row text-center sm:text-left">
          {/* Left Brand */}
          <div className="flex items-center justify-center gap-2">
            <RepoLensLogo size="sm" />
            <span className="text-xs text-zinc-500 font-mono hidden xs:inline ml-2">
              — Codebase Intelligence Platform
            </span>
          </div>

          {/* Right Nav Links & Copyright */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-400 font-mono">
            <Link href="/repositories" className="hover:text-emerald-400 transition-colors">
              Repositories
            </Link>
            <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/settings" className="hover:text-emerald-400 transition-colors">
              Settings
            </Link>
            <span className="text-zinc-600 border-l border-zinc-800 pl-4 hidden sm:inline">
              &copy; {new Date().getFullYear()} RepoLens Inc.
            </span>
          </div>

          {/* Mobile Copyright Line */}
          <div className="text-[11px] font-mono text-zinc-600 sm:hidden pt-2 border-t border-zinc-900 w-full text-center">
            &copy; {new Date().getFullYear()} RepoLens Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
