import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/shared/logout-button";
import { Code2, User as UserIcon } from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";

interface NavbarProps {
  user?: User | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-50 shadow-sm transition-transform group-hover:scale-105 dark:bg-zinc-100 dark:text-zinc-950">
            <Code2 className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              RepoLens
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              v0.1
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Dashboard
          </Link>
          <Link
            href="/repositories"
            className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Repositories
          </Link>
          <Link
            href="/settings"
            className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Settings
          </Link>
        </nav>

        {/* Action CTAs / User Auth Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Authenticated User Email Badge */}
              <Badge variant="mono" className="hidden sm:inline-flex items-center gap-1.5 py-1 px-2.5 bg-zinc-900 border-zinc-800 text-zinc-300">
                <UserIcon className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-xs max-w-[180px] truncate">{user.email}</span>
              </Badge>

              {/* Logout Action */}
              <LogoutButton />
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/repositories">
                <Button size="sm" className="gap-1.5">
                  <GithubIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Connect Repository</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
