"use client";

import { useState, useMemo, useEffect } from "react";
import {
  RepositoryFile,
  RepositoryFileAnalysis,
  SerializedGraphData,
  GraphNode,
  ChangeImpactResult,
} from "@/types";
import { getFileSourceAction, analyzeFileImpactAction } from "@/app/repositories/actions";
import { ChangeImpactPanel } from "@/components/repositories/change-impact-panel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  HardDrive,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  GitFork,
  ArrowRight,
  ArrowLeft,
  Code2,
  Eye,
  Loader2,
  Copy,
  Check,
  X,
  Flame,
} from "lucide-react";
import { isAnalyzableSourceFile } from "@/lib/ingestion/source-policy";

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

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Constructs a hierarchical tree from flat database repository_files array
 */
function buildTree(files: RepositoryFile[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  sortedFiles.forEach((file) => {
    nodeMap.set(file.path, { file, children: [] });
  });

  sortedFiles.forEach((file) => {
    const node = nodeMap.get(file.path)!;
    if (!file.parent_path) {
      roots.push(node);
    } else {
      const parentNode = nodeMap.get(file.parent_path);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
}

export function FileTreeExplorer({
  files,
  ingestedFileIds = new Set(),
  analysisMap = new Map(),
  graphData = null,
}: FileTreeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(files.filter((f) => f.depth <= 1).map((f) => f.path))
  );

  // Feature 9: Change Impact Analysis State
  const [impactResult, setImpactResult] = useState<ChangeImpactResult | null>(null);
  const [isAnalyzingImpact, setIsAnalyzingImpact] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);

  // Source Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFetchingSource, setIsFetchingSource] = useState(false);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const tree = useMemo(() => buildTree(files), [files]);

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

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.path.toLowerCase().includes(query) ||
        (f.language && f.language.toLowerCase().includes(query))
    );
  }, [files, searchQuery]);

  const selectedAnalysis = selectedFile ? analysisMap.get(selectedFile.id) : null;

  // Global Event Listener for "Inspect File" clicks from any metric card/modal
  useEffect(() => {
    const handleInspectEvent = async (e: Event) => {
      const customEvt = e as CustomEvent<{ filePath: string }>;
      const targetPath = customEvt.detail?.filePath;
      if (!targetPath) return;

      const targetFile = files.find(
        (f) => f.path === targetPath || f.path.endsWith(targetPath)
      );
      if (!targetFile) return;

      // 1. Expand all parent directories leading to this target file
      const pathParts = targetFile.path.split("/");
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        let currentPath = "";
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
          next.add(currentPath);
        }
        return next;
      });

      // 2. Highlight/Select file
      setSelectedFile(targetFile);

      // 3. Scroll to file tree section
      const section = document.getElementById("file-tree-explorer-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }

      // 4. Fetch and open source code content viewer modal directly
      setIsViewerOpen(true);
      setIsFetchingSource(true);
      setSourceError(null);
      setSourceCode(null);

      try {
        const res = await getFileSourceAction(targetFile.id);
        if (res.error || res.content === null) {
          setSourceError(res.error || "Source code content unavailable.");
        } else {
          setSourceCode(res.content);
        }
      } catch (err) {
        console.error("[handleInspectEvent Error]:", err);
        setSourceError("Failed to fetch source code content.");
      } finally {
        setIsFetchingSource(false);
      }
    };

    window.addEventListener("repolens:inspect-file", handleInspectEvent);
    return () => {
      window.removeEventListener("repolens:inspect-file", handleInspectEvent);
    };
  }, [files]);

  const selectedGraphNode: GraphNode | null = useMemo(() => {
    if (!selectedFile || !graphData?.nodes) return null;
    return (
      graphData.nodes.find(
        (n) => n.id === selectedFile.id || n.path === selectedFile.path
      ) || null
    );
  }, [selectedFile, graphData]);

  // Handler: Open Source Viewer Modal for selected file
  const handleOpenSourceViewer = async () => {
    if (!selectedFile) return;
    setIsViewerOpen(true);
    setIsFetchingSource(true);
    setSourceError(null);
    setSourceCode(null);

    try {
      const res = await getFileSourceAction(selectedFile.id);
      if (res.error || res.content === null) {
        setSourceError(res.error || "Source code content unavailable.");
      } else {
        setSourceCode(res.content);
      }
    } catch (err) {
      console.error("[handleOpenSourceViewer Error]:", err);
      setSourceError("Failed to fetch source code content.");
    } finally {
      setIsFetchingSource(false);
    }
  };

  const handleCopySource = () => {
    if (!sourceCode) return;
    navigator.clipboard.writeText(sourceCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Feature 9: Handler to compute Change Impact Analysis
  const handleAnalyzeImpact = async () => {
    if (!selectedFile || selectedFile.type !== "file") return;
    setIsAnalyzingImpact(true);
    setImpactError(null);
    setImpactResult(null);

    try {
      const res = await analyzeFileImpactAction(selectedFile.repository_id, selectedFile.id);
      if (!res.success || !res.result) {
        setImpactError(res.error || "Failed to calculate change impact analysis.");
      } else {
        setImpactResult(res.result);
      }
    } catch (err) {
      console.error("[handleAnalyzeImpact Error]:", err);
      setImpactError("An error occurred while evaluating change impact.");
    } finally {
      setIsAnalyzingImpact(false);
    }
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const { file, children } = node;
    const isExpanded = expandedPaths.has(file.path);
    const isSelected = selectedFile?.id === file.id;
    const isDir = file.type === "directory";
    const hasSource = ingestedFileIds.has(file.id);
    const isAnalyzed = analysisMap.get(file.id)?.status === "analyzed";

    return (
      <div key={file.id} className="select-none">
        <div
          onClick={() => {
            if (isDir) {
              toggleExpand(file.path);
            }
            setSelectedFile(file);
          }}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
          className={`flex items-center justify-between py-1.5 pr-3 text-xs font-mono transition-colors cursor-pointer rounded-md my-0.5 ${
            isSelected
              ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30"
              : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {isDir ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(file.path);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            {isDir ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-sky-400 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-sky-400 shrink-0" />
              )
            ) : (
              <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
            )}

            <span className="truncate">{file.name}</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] shrink-0">
            {isAnalyzed && (
              <span className="rounded bg-sky-500/10 px-1 py-0.5 text-sky-400 border border-sky-500/20 font-mono">
                AST
              </span>
            )}
            {hasSource && (
              <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-emerald-400 border border-emerald-500/20 font-mono">
                Source
              </span>
            )}
            {!isDir && file.size !== null && (
              <span className="text-zinc-500 font-mono hidden sm:inline">
                {formatBytes(file.size)}
              </span>
            )}
          </div>
        </div>

        {isDir && isExpanded && children.length > 0 && (
          <div className="space-y-0.5">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="file-tree-explorer-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-6">
      {/* Left Column: Repository Tree Navigator */}
      <Card className="lg:col-span-7 border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Repository File Tree</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Browse directories and select specific code files to inspect AST facts & source content.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files..."
                className="w-full sm:w-48 rounded-md border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="mt-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredFiles ? (
              filteredFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                  No files matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`flex items-center justify-between p-2 text-xs font-mono rounded-md cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              tree.map((node) => renderTreeNode(node))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex justify-between">
          <span>Showing {files.length} indexed items</span>
          <span>Click any file to inspect metadata</span>
        </div>
      </Card>

      {/* Right Column: File Detail Inspector Panel */}
      <Card className="lg:col-span-5 border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Specific File Inspector</h3>
            </div>
            {selectedFile && selectedFile.type === "file" && (
              <div className="flex items-center gap-2 flex-wrap">
                {ingestedFileIds.has(selectedFile.id) && (
                  <Button
                    onClick={handleOpenSourceViewer}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs h-7 px-2.5 shadow-sm gap-1 cursor-pointer font-mono"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Source</span>
                  </Button>
                )}

                <Button
                  onClick={handleAnalyzeImpact}
                  disabled={isAnalyzingImpact}
                  size="sm"
                  className="bg-rose-500 hover:bg-rose-400 text-zinc-950 font-semibold text-xs h-7 px-2.5 shadow-sm gap-1 cursor-pointer font-mono"
                >
                  {isAnalyzingImpact ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing Impact...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="h-3.5 w-3.5" />
                      <span>Analyze Change Impact</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {selectedFile ? (
            <div className="mt-4 space-y-4 font-mono text-xs">
              {/* File Name & Path */}
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

              {/* Dependency Intelligence Breakdown */}
              {selectedGraphNode && (
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <GitFork className="h-3 w-3 text-purple-400" />
                    <span>File Dependency Edges</span>
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
                <div className="mt-1 flex items-center justify-between">
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

              {/* AST Analysis Status & Defined Symbols List */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  AST Structural Facts & Defined Symbols
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

                      {/* Display Exact Symbol Names Defined in this File */}
                      {selectedAnalysis.analysis && (
                        <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                          {selectedAnalysis.analysis.functions?.length > 0 && (
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">
                                Defined Functions:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {selectedAnalysis.analysis.functions.map((fn) => (
                                  <span
                                    key={fn.name}
                                    className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/20"
                                  >
                                    {fn.name}() {fn.startLine ? `(L${fn.startLine})` : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedAnalysis.analysis.components?.length > 0 && (
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">
                                React Components:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {selectedAnalysis.analysis.components.map((comp) => (
                                  <span
                                    key={comp.name}
                                    className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300 border border-amber-500/20"
                                  >
                                    &lt;{comp.name} /&gt;
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedAnalysis.analysis.classes?.length > 0 && (
                            <div>
                              <span className="text-[10px] text-zinc-500 block mb-1">
                                Defined Classes:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {selectedAnalysis.analysis.classes.map((cls) => (
                                  <span
                                    key={cls.name}
                                    className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300 border border-purple-500/20"
                                  >
                                    class {cls.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : selectedAnalysis?.status === "unsupported" ? (
                    <Badge variant="mono" className="gap-1 font-mono text-[11px] text-zinc-400">
                      <Info className="h-3 w-3 text-zinc-500" />
                      <span>AST: Unsupported ({selectedFile.language || "Format"})</span>
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
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">
              Select a file or directory from the tree to view its specific metadata & source code.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded bg-zinc-950 p-3 text-[11px] text-zinc-400 border border-zinc-800">
          <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            Select any file to inspect its exact AST symbol definitions, file dependency connections, and raw source code.
          </span>
        </div>
      </Card>

      {/* Feature 9: Change Impact Error Alert */}
      {impactError && (
        <div className="col-span-1 lg:col-span-12 mt-4 flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{impactError}</span>
        </div>
      )}

      {/* Feature 9: Change Impact Analysis Panel */}
      {impactResult && (
        <div className="col-span-1 lg:col-span-12 mt-6">
          <ChangeImpactPanel impact={impactResult} />
        </div>
      )}

      {/* Interactive Source Code Viewer Modal */}
      {isViewerOpen && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900/90">
              <div className="flex items-center gap-2.5">
                <Code2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-mono text-sm font-semibold text-zinc-100">
                    {selectedFile.name}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">{selectedFile.path}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sourceCode && (
                  <Button
                    onClick={handleCopySource}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-mono gap-1.5"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => setIsViewerOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-5 font-mono text-xs bg-zinc-950">
              {isFetchingSource ? (
                <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  <span>Fetching source code content...</span>
                </div>
              ) : sourceError ? (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{sourceError}</span>
                </div>
              ) : sourceCode ? (
                <pre className="text-zinc-200 leading-relaxed overflow-x-auto selection:bg-emerald-500/30">
                  {sourceCode.split("\n").map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="table-cell whitespace-pre">{line}</span>
                    </div>
                  ))}
                </pre>
              ) : (
                <div className="text-center py-12 text-zinc-500">No source content available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
