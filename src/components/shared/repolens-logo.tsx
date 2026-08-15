"use client";

import React from "react";

interface RepoLensLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showGlow?: boolean;
}

export function RepoLensLogo({
  className = "",
  iconOnly = false,
  size = "md",
  showGlow = false,
}: RepoLensLogoProps) {
  const iconSizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-18 w-18",
    hero: "h-28 w-28 sm:h-32 sm:w-32",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl sm:text-4xl",
    hero: "text-3xl sm:text-5xl font-extrabold",
  };

  return (
    <div className={`flex items-center gap-3 group ${className}`} suppressHydrationWarning>
      {/* Seamless Circular Brand Icon without outer artificial black border */}
      <div className="relative flex items-center justify-center" suppressHydrationWarning>
        {(showGlow || size === "hero" || size === "xl") && (
          <div
            className="absolute inset-0 -m-3 rounded-full bg-emerald-500/25 blur-2xl animate-pulse pointer-events-none"
            suppressHydrationWarning
          />
        )}
        <div
          suppressHydrationWarning
          className={`relative flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 ${iconSizes[size]}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="RepoLens Logo"
            suppressHydrationWarning
            className="h-full w-full object-contain rounded-full drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
          />
        </div>
      </div>

      {!iconOnly && (
        <div className="flex items-center gap-2 font-mono" suppressHydrationWarning>
          <span className={`font-bold tracking-tight text-zinc-100 ${textSizes[size]}`} suppressHydrationWarning>
            Repo<span className="text-emerald-400">Lens</span>
          </span>
          <span
            className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400 border border-emerald-500/30"
            suppressHydrationWarning
          >
            v0.1
          </span>
        </div>
      )}
    </div>
  );
}
