import React from "react";

interface RepoLensLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RepoLensLogo({
  className = "",
  iconOnly = false,
  size = "md",
}: RepoLensLogoProps) {
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-8.5 w-8.5",
    lg: "h-11 w-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      {/* Brand Vector Icon Badge */}
      <div className={`relative flex items-center justify-center rounded-xl bg-zinc-950 p-1 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 transition-transform group-hover:scale-105 ${iconSizes[size]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/repolens-icon.png"
          alt="RepoLens Logo Icon"
          className="h-full w-full object-cover rounded-lg"
        />
      </div>

      {!iconOnly && (
        <div className="flex items-center gap-1.5 font-mono">
          <span className={`font-bold tracking-tight text-zinc-100 ${textSizes[size]}`}>
            Repo<span className="text-emerald-400">Lens</span>
          </span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
            v0.1
          </span>
        </div>
      )}
    </div>
  );
}
