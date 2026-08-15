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
    sm: "h-7 w-7 rounded-lg p-0.5",
    md: "h-8.5 w-8.5 rounded-xl p-1",
    lg: "h-12 w-12 rounded-xl p-1.5",
    xl: "h-16 w-16 rounded-2xl p-2",
    hero: "h-24 w-24 sm:h-28 sm:w-28 rounded-3xl p-3",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl sm:text-4xl",
    hero: "text-3xl sm:text-5xl font-extrabold",
  };

  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      {/* Brand Vector Icon Badge with Multi-Layer Glow */}
      <div className="relative">
        {(showGlow || size === "hero" || size === "xl") && (
          <div className="absolute inset-0 -m-3 rounded-full bg-emerald-500/25 blur-2xl animate-pulse pointer-events-none" />
        )}
        <div
          className={`relative flex items-center justify-center bg-zinc-950 border border-emerald-500/40 shadow-2xl shadow-emerald-500/20 transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-400 ${iconSizes[size]}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/repolens-icon.png"
            alt="RepoLens Logo Icon"
            className="h-full w-full object-cover rounded-xl shadow-inner"
          />
        </div>
      </div>

      {!iconOnly && (
        <div className="flex items-center gap-2 font-mono">
          <span className={`font-bold tracking-tight text-zinc-100 ${textSizes[size]}`}>
            Repo<span className="text-emerald-400">Lens</span>
          </span>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400 border border-emerald-500/30">
            v0.1
          </span>
        </div>
      )}
    </div>
  );
}
