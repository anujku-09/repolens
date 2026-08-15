"use client";

import { useState, useEffect, ReactNode } from "react";
import {
  LayoutDashboard,
  GitFork,
  Code2,
  FolderTree,
} from "lucide-react";

interface RepositoryDashboardTabsProps {
  overviewContent: ReactNode;
  dependencyContent: ReactNode;
  symbolsAdvisorContent: ReactNode;
  explorerContent: ReactNode;
}

export type RepositoryTab = "overview" | "dependencies" | "symbols-advisor" | "explorer";

export function RepositoryDashboardTabs({
  overviewContent,
  dependencyContent,
  symbolsAdvisorContent,
  explorerContent,
}: RepositoryDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<RepositoryTab>("overview");

  // Automatically switch tab to File Explorer when user clicks "Inspect File" anywhere in the app
  useEffect(() => {
    const handleInspectFile = () => {
      setActiveTab("explorer");
    };

    window.addEventListener("repolens:inspect-file", handleInspectFile);
    return () => {
      window.removeEventListener("repolens:inspect-file", handleInspectFile);
    };
  }, []);

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Sub-Navigation Tabs Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 font-mono text-xs overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === "overview"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
          }`}
        >
          <LayoutDashboard className="h-4 w-4 text-purple-400" />
          <span>Overview & Health</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dependencies")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === "dependencies"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
          }`}
        >
          <GitFork className="h-4 w-4 text-sky-400" />
          <span>Dependency Network</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("symbols-advisor")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === "symbols-advisor"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
          }`}
        >
          <Code2 className="h-4 w-4 text-amber-400" />
          <span>Symbols & AI Refactoring</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("explorer")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === "explorer"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
          }`}
        >
          <FolderTree className="h-4 w-4 text-emerald-400" />
          <span>File Tree & Source Inspector</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="w-full">
        <div key="tab-panel-overview" className={activeTab === "overview" ? "block" : "hidden"}>
          {overviewContent}
        </div>
        <div key="tab-panel-dependencies" className={activeTab === "dependencies" ? "block" : "hidden"}>
          {dependencyContent}
        </div>
        <div key="tab-panel-symbols" className={activeTab === "symbols-advisor" ? "block" : "hidden"}>
          {symbolsAdvisorContent}
        </div>
        <div key="tab-panel-explorer" className={activeTab === "explorer" ? "block" : "hidden"}>
          {explorerContent}
        </div>
      </div>
    </div>
  );
}
