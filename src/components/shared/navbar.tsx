"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/shared/logout-button";
import { Code2, User as UserIcon } from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";

import { RepoLensLogo } from "@/components/shared/repolens-logo";

interface NavbarProps {
  user?: User | null;
  profile?: Profile | null;
}

export function Navbar({ user, profile }: NavbarProps) {
  const pathname = usePathname();
  const username = profile?.username || (user?.email ? user.email.split("@")[0] : null);
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const isDashboard = pathname === "/dashboard";
  const isRepositories = pathname.startsWith("/repositories");
  const isSettings = pathname === "/settings";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/">
          <RepoLensLogo size="md" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium font-mono">
          <Link
            href="/dashboard"
            className={`transition-colors py-1 ${
              isDashboard
                ? "text-emerald-400 font-semibold underline underline-offset-4 decoration-emerald-500/60"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/repositories"
            className={`transition-colors py-1 ${
              isRepositories
                ? "text-emerald-400 font-semibold underline underline-offset-4 decoration-emerald-500/60"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Repositories
          </Link>
          <Link
            href="/settings"
            className={`transition-colors py-1 ${
              isSettings
                ? "text-emerald-400 font-semibold underline underline-offset-4 decoration-emerald-500/60"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Settings
          </Link>
        </nav>

        {/* Action CTAs / User Profile Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Profile Badge */}
              <Link href="/settings">
                <Badge
                  variant="mono"
                  className="hidden sm:inline-flex items-center gap-2 py-1 px-3 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={username || "User Avatar"}
                      className="h-4 w-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                  {username ? (
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      @{username}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-zinc-300 max-w-[140px] truncate">
                      {user.email}
                    </span>
                  )}
                </Badge>
              </Link>

              {/* Logout Action */}
              <LogoutButton />
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="h-8 text-xs font-mono">
                  Sign In
                </Button>
              </Link>
              <Link href="/repositories">
                <Button size="sm" className="h-8 gap-1.5 text-xs font-mono bg-zinc-100 text-zinc-950 hover:bg-white">
                  <GithubIcon className="h-3.5 w-3.5" />
                  <span>Connect</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation Sub-Bar (< 768px) */}
      <div className="md:hidden border-t border-zinc-800/80 bg-zinc-950 px-3 py-1.5 flex items-center justify-around text-xs font-mono">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className={`px-3 py-1 rounded-md transition-colors ${
                isDashboard
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/repositories"
              className={`px-3 py-1 rounded-md transition-colors ${
                isRepositories
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
              }`}
            >
              Repositories
            </Link>
            <Link
              href="/settings"
              className={`px-3 py-1 rounded-md transition-colors ${
                isSettings
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
              }`}
            >
              Settings
            </Link>
          </>
        ) : (
          <>
            <a
              href="#visualizer"
              className="px-3 py-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Live Demo
            </a>
            <a
              href="#features"
              className="px-3 py-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Features
            </a>
            <Link
              href="/repositories"
              className="px-3 py-1 text-emerald-400 font-semibold"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
