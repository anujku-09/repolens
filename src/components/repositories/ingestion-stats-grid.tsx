"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Files, FolderTree, HardDrive, GitBranch, ArrowUpRight } from "lucide-react";

interface IngestionStatsGridProps {
  totalFiles: number;
  totalDirectories: number;
  formattedCodeSize: string;
  defaultBranch: string;
  githubRepoUrl?: string;
}

export function IngestionStatsGrid({
  totalFiles,
  totalDirectories,
  formattedCodeSize,
  defaultBranch,
  githubRepoUrl,
}: IngestionStatsGridProps) {
  const handleOpenExplorerTab = () => {
    // Switch to File Explorer tab by clicking its button or firing inspect event
    const explorerTabBtn = document.querySelector<HTMLButtonElement>(
      'button[onClick*="explorer"]'
    );
    if (explorerTabBtn) {
      explorerTabBtn.click();
    } else {
      window.dispatchEvent(
        new CustomEvent("repolens:inspect-file", {
          detail: { filePath: "" },
        })
      );
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5 font-sans">
      {/* Total Files Card */}
      <Card
        onClick={handleOpenExplorerTab}
        className="group border-zinc-800 bg-zinc-900/40 p-5 hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer transition-all"
      >
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs group-hover:text-emerald-400 transition-colors">
              <Files className="h-4 w-4 text-emerald-400" />
              <span>Total Files</span>
            </CardDescription>
            <span className="text-[10px] text-zinc-500 font-mono group-hover:text-emerald-400 transition-colors">
              Inspect Tree &rarr;
            </span>
          </div>
          <CardTitle className="text-2xl font-mono text-zinc-100 mt-2">
            {totalFiles.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Directories Card */}
      <Card
        onClick={handleOpenExplorerTab}
        className="group border-zinc-800 bg-zinc-900/40 p-5 hover:border-sky-500/50 hover:bg-sky-500/5 cursor-pointer transition-all"
      >
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs group-hover:text-sky-400 transition-colors">
              <FolderTree className="h-4 w-4 text-sky-400" />
              <span>Directories</span>
            </CardDescription>
            <span className="text-[10px] text-zinc-500 font-mono group-hover:text-sky-400 transition-colors">
              Inspect Tree &rarr;
            </span>
          </div>
          <CardTitle className="text-2xl font-mono text-zinc-100 mt-2">
            {totalDirectories.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Total Code Size Card */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-5 font-mono">
        <CardHeader className="p-0">
          <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs font-sans">
            <HardDrive className="h-4 w-4 text-amber-400" />
            <span>Total Code Size</span>
          </CardDescription>
          <CardTitle className="text-2xl font-mono text-zinc-100 mt-2">
            {formattedCodeSize}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Default Branch Card */}
      <Card
        onClick={() => {
          if (githubRepoUrl) {
            window.open(githubRepoUrl, "_blank", "noopener,noreferrer");
          }
        }}
        className={`group border-zinc-800 bg-zinc-900/40 p-5 ${
          githubRepoUrl ? "hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer" : ""
        } transition-all`}
      >
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs group-hover:text-purple-400 transition-colors">
              <GitBranch className="h-4 w-4 text-purple-400" />
              <span>Default Branch</span>
            </CardDescription>
            {githubRepoUrl && (
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
            )}
          </div>
          <CardTitle className="text-xl font-mono text-zinc-100 mt-2 truncate">
            {defaultBranch}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
