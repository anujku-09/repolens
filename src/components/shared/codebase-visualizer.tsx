"use client";

import { useState } from "react";
import {
  Folder,
  FileCode,
  FileJson,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  GitBranch,
  Search,
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FileItem {
  name: string;
  type: "folder" | "file";
  path: string;
  size?: string;
  status?: "analyzed" | "indexing" | "ready";
  children?: FileItem[];
  extension?: string;
}

const mockTree: FileItem[] = [
  {
    name: "src",
    type: "folder",
    path: "/src",
    children: [
      {
        name: "app",
        type: "folder",
        path: "/src/app",
        children: [
          { name: "layout.tsx", type: "file", path: "/src/app/layout.tsx", size: "1.2 KB", extension: "tsx", status: "analyzed" },
          { name: "page.tsx", type: "file", path: "/src/app/page.tsx", size: "3.4 KB", extension: "tsx", status: "analyzed" },
          { name: "globals.css", type: "file", path: "/src/app/globals.css", size: "850 B", extension: "css", status: "analyzed" },
        ],
      },
      {
        name: "components",
        type: "folder",
        path: "/src/components",
        children: [
          { name: "codebase-visualizer.tsx", type: "file", path: "/src/components/codebase-visualizer.tsx", size: "4.8 KB", extension: "tsx", status: "analyzed" },
          { name: "navbar.tsx", type: "file", path: "/src/components/navbar.tsx", size: "2.1 KB", extension: "tsx", status: "analyzed" },
        ],
      },
      {
        name: "lib",
        type: "folder",
        path: "/src/lib",
        children: [
          { name: "github.ts", type: "file", path: "/src/lib/github.ts", size: "1.8 KB", extension: "ts", status: "analyzed" },
          { name: "supabase.ts", type: "file", path: "/src/lib/supabase.ts", size: "1.1 KB", extension: "ts", status: "analyzed" },
        ],
      },
    ],
  },
  { name: "next.config.ts", type: "file", path: "/next.config.ts", size: "420 B", extension: "ts", status: "analyzed" },
  { name: "package.json", type: "file", path: "/package.json", size: "890 B", extension: "json", status: "analyzed" },
  { name: "tsconfig.json", type: "file", path: "/tsconfig.json", size: "650 B", extension: "json", status: "analyzed" },
];

export function CodebaseVisualizer() {
  const [selectedFile, setSelectedFile] = useState<string>("/src/app/page.tsx");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "/src": true,
    "/src/app": true,
    "/src/components": true,
    "/src/lib": true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (items: FileItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders[item.path];
      const isSelected = selectedFile === item.path;

      if (item.type === "folder") {
        return (
          <div key={item.path} className="select-none">
            <button
              onClick={() => toggleFolder(item.path)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <Folder className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10" />
              <span className="font-mono text-zinc-200">{item.name}</span>
            </button>
            {isExpanded && item.children && (
              <div>{renderTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <button
          key={item.path}
          onClick={() => setSelectedFile(item.path)}
          className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
            isSelected
              ? "bg-emerald-500/15 text-emerald-300 font-medium border-l-2 border-emerald-400"
              : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
          }`}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            {item.extension === "json" ? (
              <FileJson className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <FileCode className="h-3.5 w-3.5 text-sky-400" />
            )}
            <span className="font-mono truncate">{item.name}</span>
          </div>
          {item.size && (
            <span className="font-mono text-[10px] text-zinc-600">
              {item.size}
            </span>
          )}
        </button>
      );
    });
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-sans">
      {/* Editor Top Control Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
            <span>main</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 font-semibold">repolens/repolens-core</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" className="gap-1 text-[11px] py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            <span>Codebase Analyzed</span>
          </Badge>
          <Badge variant="mono" className="hidden sm:inline-flex text-[11px]">
            AST Indexing: 100%
          </Badge>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
        {/* Left Sidebar: Repository File Tree */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-950 p-3 flex flex-col">
          <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            <span>Repository Explorer</span>
            <Search className="h-3.5 w-3.5 text-zinc-600" />
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto">
            {renderTree(mockTree)}
          </div>
        </div>

        {/* Center/Right Pane: Architecture Insights & Code Analysis Preview */}
        <div className="md:col-span-8 bg-zinc-900/40 p-4 md:p-6 flex flex-col justify-between">
          <div>
            {/* Breadcrumb Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <span className="text-zinc-500">File Analysis</span>
                <span className="text-zinc-600">&gt;</span>
                <span className="text-emerald-400 font-semibold">{selectedFile}</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">TypeScript React</span>
            </div>

            {/* Architecture Insight Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <span>Module Depth</span>
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">3 Layers</div>
                <div className="text-[10px] text-zinc-500 mt-1">Clean App Router Hierarchy</div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  <span>Dependencies</span>
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">12 Imports</div>
                <div className="text-[10px] text-zinc-500 mt-1">0 Circular References</div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Health Score</span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400">98 / 100</div>
                <div className="text-[10px] text-emerald-500/80 mt-1">Optimal maintainability</div>
              </div>
            </div>

            {/* Simulated Code & Architecture Summary Box */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 space-y-2 leading-relaxed">
              <div className="text-zinc-500 text-[11px]">
                {"// RepoLens AI Architectural Insights Summary"}
              </div>
              <div className="text-emerald-400 font-semibold">
                ✓ Architecture Pattern Identified: Modular Next.js App Router
              </div>
              <p className="text-zinc-400 text-xs">
                This repository exhibits strict layer isolation. UI components in <code className="text-sky-300">src/components</code> decoupled from data clients in <code className="text-sky-300">src/lib</code>.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">React Server Components</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">TypeScript Strict Mode</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">Tailwind CSS v4</span>
              </div>
            </div>
          </div>

          {/* Bottom Live Analysis Bar */}
          <div className="mt-6 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>Scanning engine ready</span>
            </div>
            <div>Analyzed 18 files &bull; 4,210 lines of code</div>
          </div>
        </div>
      </div>
    </div>
  );
}
