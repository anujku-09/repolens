"use client";

import { useState, useMemo } from "react";
import { RepositoryFile, RepositoryFileAnalysis, SerializedGraphData } from "@/types";
import { isAnalyzableSourceFile } from "@/lib/ingestion/source-policy";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileImage,
  File,
  Search,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  HardDrive,
  Info,
  CheckCircle2,
  XCircle,
  Cpu,
  AlertCircle,
  GitFork,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface FileTreeExplorerProps {
  files: RepositoryFile[];
  ingestedFileIds?: Set<string>;
  analysisMap?: Map<string, RepositoryFileAnalysis>;
  graphData?: SerializedGraphData | null;
}

interface TreeNode {
  file: RepositoryFile;
  children: TreeNode[];
}

/**
 * Format raw byte size into human-readable B, KB, MB
 */
function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined || bytes === 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get icon component for a file based on its extension / language
 */
function getFileIcon(file: RepositoryFile) {
  if (file.type === "directory") {
    return null; // Handled dynamically for open/closed state
  }

  const ext = file.extension?.toLowerCase();
  const lang = file.language?.toLowerCase();

  if (lang === "json" || ext === ".json") {
    return <FileJson className="h-4 w-4 text-amber-400 shrink-0" />;
  }
  if (lang === "markdown" || ext === ".md") {
    return <FileText className="h-4 w-4 text-sky-400 shrink-0" />;
  }
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".svg" || ext === ".gif") {
    return <FileImage className="h-4 w-4 text-purple-400 shrink-0" />;
  }
  if (
    lang === "typescript" ||
    lang === "javascript" ||
    lang === "python" ||
    lang === "go" ||
    lang === "rust" ||
    lang === "c/c++" ||
    lang === "html" ||
    lang === "css"
  ) {
    return <FileCode className="h-4 w-4 text-emerald-400 shrink-0" />;
  }

  return <File className="h-4 w-4 text-zinc-400 shrink-0" />;
}

export function FileTreeExplorer({
  files,
  ingestedFileIds = new Set(),
  analysisMap = new Map(),
  graphData = null,
}: FileTreeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);

  // Build recursive tree structure from flat file list
  const treeNodes = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Sort files so directories come first, then files alphabetically
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    sortedFiles.forEach((file) => {
      const node: TreeNode = { file, children: [] };
      nodeMap.set(file.path, node);

      if (!file.parent_path) {
        rootNodes.push(node);
      } else {
        const parentNode = nodeMap.get(file.parent_path);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Fallback root item
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }, [files]);

  // Filtered files for search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        (f.extension && f.extension.toLowerCase().includes(q))
    );
  }, [files, searchQuery]);

  // Fast map lookup for selected file node dependencies in graph
  const graphNodeMap = useMemo(() => {
    const map = new Map<string, NonNullable<SerializedGraphData["nodes"]>[0]>();
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((n) => {
        map.set(n.id, n);
        map.set(n.path, n);
      });
    }
    return map;
  }, [graphData]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allDirs = files.filter((f) => f.type === "directory").map((f) => f.path);
    setExpandedPaths(new Set([...allDirs, ""]));
  };

  const collapseAll = () => {
    setExpandedPaths(new Set());
  };

  // Render a single node in tree view
  const renderTreeNode = (node: TreeNode) => {
    const { file, children } = node;
    const isDir = file.type === "directory";
    const isExpanded = expandedPaths.has(file.path);
    const isSelected = selectedFile?.id === file.id;
    const isSourceIngested = ingestedFileIds.has(file.id);
    const analysis = analysisMap.get(file.id);

    return (
      <div key={file.id} className="select-none font-mono text-xs">
        <div
          onClick={() => {
            if (isDir) {
              toggleExpand(file.path);
            }
            setSelectedFile(file);
          }}
          className={`flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
            isSelected
              ? "bg-emerald-500/15 text-emerald-300 font-semibold"
              : "hover:bg-zinc-800/60 text-zinc-300"
          }`}
          style={{ paddingLeft: `${Math.max(file.depth * 14, 8)}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isDir ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(file.path);
                  }}
                  className="p-0.5 text-zinc-500 hover:text-zinc-300"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 text-emerald-500/80 shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" /> {/* Spacer for tree alignment */}
                {getFileIcon(file)}
              </>
            )}

            <span className="truncate">{file.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-500">
            {analysis?.status === "analyzed" && (
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" title="AST Structure Analyzed" />
            )}
            {isSourceIngested && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Source Content Indexed" />
            )}
            {file.language && (
              <Badge variant="mono" className="text-[10px] py-0 px-1.5">
                {file.language}
              </Badge>
            )}
            {!isDir && file.size !== null && (
              <span className="text-zinc-500">{formatBytes(file.size)}</span>
            )}
          </div>
        </div>

        {/* Recursive Children Rendering */}
        {isDir && isExpanded && children.length > 0 && (
          <div className="border-l border-zinc-800/60 ml-3.5">
            {children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <Card className="border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center">
        <Folder className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
        <h4 className="text-sm font-semibold text-zinc-300">No file tree indexed yet</h4>
        <p className="text-xs text-zinc-500 mt-1">
          Click &quot;Ingest Repository&quot; to fetch and parse the file structure.
        </p>
      </Card>
    );
  }

  const selectedAnalysis = selectedFile ? analysisMap.get(selectedFile.id) : undefined;
  const selectedGraphNode = selectedFile
    ? graphNodeMap.get(selectedFile.id) || graphNodeMap.get(selectedFile.path)
    : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Interactive Tree Explorer */}
      <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/50 p-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files by name or extension..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <Minimize2 className="h-3 w-3" />
                <span>Collapse All</span>
              </button>
            </div>
          </div>

          {/* Tree Explorer View */}
          <div className="max-h-[500px] overflow-y-auto space-y-0.5 pr-2 custom-scrollbar">
            {filteredFiles ? (
              // Search Mode View
              filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  No files matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`flex items-center justify-between rounded-md p-2 cursor-pointer font-mono text-xs transition-colors ${
                      selectedFile?.id === file.id
                        ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                        : "hover:bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(file)}
                      <span className="truncate">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 shrink-0">
                      {file.language && <Badge variant="mono">{file.language}</Badge>}
                      <span>{formatBytes(file.size)}</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Standard Tree View
              treeNodes.map(renderTreeNode)
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex justify-between">
          <span>Showing {files.length} indexed items</span>
          <span>Click any file to inspect metadata</span>
        </div>
      </Card>

      {/* Right Column: File Detail Inspector Panel */}
      <Card className="border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <HardDrive className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">File Inspector</h3>
          </div>

          {selectedFile ? (
            <div className="mt-4 space-y-4 font-mono text-xs">
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  File Name
                </label>
                <p className="text-zinc-100 font-semibold text-sm break-all mt-0.5">
                  {selectedFile.name}
                </p>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  Full Path
                </label>
                <p className="text-zinc-300 break-all bg-zinc-950 p-2 rounded border border-zinc-800 text-[11px] mt-0.5">
                  {selectedFile.path}
                </p>
              </div>

              {/* Dependency Intelligence Breakdown (Feature 7) */}
              {selectedGraphNode && (
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <GitFork className="h-3 w-3 text-purple-400" />
                    <span>Dependency Graph Intelligence</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2 text-center mt-1">
                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase">Imports (Out)</span>
                      <p className="text-sm font-bold text-sky-400 mt-0.5">
                        {selectedGraphNode.outDegree}
                      </p>
                    </div>
                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase">Imported By (In)</span>
                      <p className="text-sm font-bold text-purple-400 mt-0.5">
                        {selectedGraphNode.inDegree}
                      </p>
                    </div>
                  </div>

                  {selectedGraphNode.imports.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-sky-400" />
                        <span>Dependencies ({selectedGraphNode.imports.length}):</span>
                      </span>
                      <div className="mt-1 max-h-[80px] overflow-y-auto space-y-1 custom-scrollbar">
                        {selectedGraphNode.imports.map((p) => (
                          <div
                            key={p}
                            className="truncate rounded bg-zinc-950 px-2 py-0.5 text-[10px] text-sky-300 border border-zinc-800/60"
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedGraphNode.importedBy.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <ArrowLeft className="h-3 w-3 text-purple-400" />
                        <span>Imported By ({selectedGraphNode.importedBy.length}):</span>
                      </span>
                      <div className="mt-1 max-h-[80px] overflow-y-auto space-y-1 custom-scrollbar">
                        {selectedGraphNode.importedBy.map((p) => (
                          <div
                            key={p}
                            className="truncate rounded bg-zinc-950 px-2 py-0.5 text-[10px] text-purple-300 border border-zinc-800/60"
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Source Content Index Status */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  Source Content Status
                </label>
                <div className="mt-1">
                  {ingestedFileIds.has(selectedFile.id) ? (
                    <Badge variant="emerald" className="gap-1 font-mono text-[11px]">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Source: Indexed</span>
                    </Badge>
                  ) : isAnalyzableSourceFile(selectedFile) ? (
                    <Badge variant="mono" className="gap-1 font-mono text-[11px] text-zinc-400">
                      <XCircle className="h-3 w-3 text-zinc-500" />
                      <span>Source: Not Indexed</span>
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="gap-1 font-mono text-[11px] text-zinc-500">
                      <span>Skipped (Oversized / Non-code)</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* AST Analysis Status & Structural Facts Breakdown */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  AST Structural Facts
                </label>
                <div className="mt-1">
                  {selectedAnalysis?.status === "analyzed" ? (
                    <div className="space-y-2">
                      <Badge variant="emerald" className="gap-1 font-mono text-[11px]">
                        <Cpu className="h-3 w-3 text-sky-400" />
                        <span>AST: Analyzed</span>
                      </Badge>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
                        <div>
                          <span className="text-zinc-500">Imports:</span>{" "}
                          <strong className="text-zinc-200">{selectedAnalysis.imports_count}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500">Exports:</span>{" "}
                          <strong className="text-zinc-200">{selectedAnalysis.exports_count}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500">Functions:</span>{" "}
                          <strong className="text-emerald-400">{selectedAnalysis.functions_count}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500">Classes:</span>{" "}
                          <strong className="text-purple-400">{selectedAnalysis.classes_count}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500">Variables:</span>{" "}
                          <strong className="text-zinc-300">{selectedAnalysis.variables_count}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500">Components:</span>{" "}
                          <strong className="text-amber-400">{selectedAnalysis.components_count}</strong>
                        </div>
                      </div>
                    </div>
                  ) : selectedAnalysis?.status === "unsupported" ? (
                    <Badge variant="mono" className="gap-1 font-mono text-[11px] text-zinc-400">
                      <Info className="h-3 w-3 text-zinc-500" />
                      <span>AST: Unsupported ({selectedFile.language || "Format"})</span>
                    </Badge>
                  ) : selectedAnalysis?.status === "failed" ? (
                    <Badge variant="rose" className="gap-1 font-mono text-[11px]">
                      <AlertCircle className="h-3 w-3" />
                      <span>AST: Failed Parse</span>
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="gap-1 font-mono text-[11px] text-zinc-500">
                      <span>AST: Pending Analysis</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
                <div>
                  <label className="text-[11px] text-zinc-500">Type</label>
                  <p className="text-zinc-200 capitalize mt-0.5">{selectedFile.type}</p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500">Size</label>
                  <p className="text-emerald-400 font-semibold mt-0.5">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500">Language</label>
                  <p className="text-zinc-200 mt-0.5">
                    {selectedFile.language || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500">Extension</label>
                  <p className="text-zinc-200 mt-0.5">
                    {selectedFile.extension || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500">Tree Depth</label>
                  <p className="text-zinc-200 mt-0.5">Level {selectedFile.depth}</p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500">Parent Path</label>
                  <p className="text-zinc-200 truncate mt-0.5">
                    {selectedFile.parent_path || "(Root)"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">
              Select a file or directory from the tree to view its metadata.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded bg-zinc-950 p-3 text-[11px] text-zinc-400 border border-zinc-800">
          <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            Dependency intelligence resolves internal import references, detects circular loops, and maps module interactions.
          </span>
        </div>
      </Card>
    </div>
  );
}
