"use client";

import { useState, useMemo } from "react";
import { SerializedGraphData, GraphNode } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  FileCode,
  FileJson,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitBranch,
  Layers,
  ArrowRight,
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

interface CodebaseVisualizerProps {
  graphData?: SerializedGraphData | null;
  repositoryFullName?: string;
  defaultBranch?: string;
}

export function CodebaseVisualizer({
  graphData,
  repositoryFullName = "repository",
  defaultBranch = "main",
}: CodebaseVisualizerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];
  const summary = graphData?.summary || null;

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase().trim();
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q) ||
        (n.language && n.language.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

  // Find currently selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return nodes[0] || null;
    return nodes.find((n) => n.id === selectedNodeId || n.path === selectedNodeId) || nodes[0] || null;
  }, [nodes, selectedNodeId]);

  // Compute connected nodes for highlighting
  const connectedPaths = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>();
    set.add(selectedNode.path);
    selectedNode.imports.forEach((p) => set.add(p));
    selectedNode.importedBy.forEach((p) => set.add(p));
    return set;
  }, [selectedNode]);

  // Calculate layout coordinates for SVG network graph nodes
  const layoutNodes = useMemo(() => {
    const list = filteredNodes.slice(0, 40); // Max 40 nodes rendered visually for performance
    const count = list.length;
    if (count === 0) return [];

    const radius = Math.min(220 + count * 6, 320);
    const centerX = 360;
    const centerY = 240;

    return list.map((node, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { ...node, x, y };
    });
  }, [filteredNodes]);

  const layoutMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    layoutNodes.forEach((n) => map.set(n.path, { x: n.x, y: n.y }));
    return map;
  }, [layoutNodes]);

  if (nodes.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center font-mono">
        <Share2 className="mx-auto h-10 w-10 text-purple-400 mb-3 opacity-80" />
        <h3 className="text-base font-semibold text-zinc-200">No Dependency Graph Generated Yet</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 font-sans">
          Click <strong>&quot;Build Dependency Graph&quot;</strong> above to resolve import paths and generate your repository dependency network map.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-sans">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <GitBranch className="h-3.5 w-3.5 text-purple-400" />
            <span>{defaultBranch}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 font-semibold">{repositoryFullName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" className="gap-1 text-[11px] py-0.5 font-mono">
            <CheckCircle2 className="h-3 w-3 text-purple-400" />
            <span>Graph Resolved ({edges.length} edges)</span>
          </Badge>

          {summary && summary.circularDependencyCount > 0 && (
            <Badge variant="amber" className="gap-1 text-[11px] py-0.5 font-mono">
              <AlertTriangle className="h-3 w-3" />
              <span>{summary.circularDependencyCount} Cycles</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left Interactive SVG Network Graph */}
        <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-950 p-4 relative flex flex-col justify-between overflow-hidden">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3 mb-3 z-10">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file node by name..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md p-1 font-mono text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.8))}
                className="p-1 hover:text-zinc-100 rounded hover:bg-zinc-800"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.6))}
                className="p-1 hover:text-zinc-100 rounded hover:bg-zinc-800"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:text-zinc-100 rounded hover:bg-zinc-800"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-[11px] text-zinc-500">{(zoomLevel * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* SVG Graph Canvas */}
          <div className="flex-1 min-h-[360px] flex items-center justify-center overflow-hidden relative">
            <svg
              viewBox="0 0 720 480"
              className="w-full h-full max-h-[440px] transition-transform duration-200 ease-out cursor-grab"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="14"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#a855f7" opacity="0.6" />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="8"
                  markerHeight="6"
                  refX="14"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Edge Lines */}
              {edges.map((edge) => {
                const src = layoutMap.get(edge.source);
                const tgt = layoutMap.get(edge.target);
                if (!src || !tgt) return null;

                const isConnectedToSelected =
                  selectedNode &&
                  (edge.source === selectedNode.path || edge.target === selectedNode.path);

                return (
                  <line
                    key={edge.id}
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isConnectedToSelected ? "#38bdf8" : "#3f3f46"}
                    strokeWidth={isConnectedToSelected ? 2 : 1}
                    strokeDasharray={isConnectedToSelected ? undefined : "3 3"}
                    opacity={isConnectedToSelected ? 1 : 0.4}
                    markerEnd={isConnectedToSelected ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  />
                );
              })}

              {/* Node Elements */}
              {layoutNodes.map((node) => {
                const isSelected = selectedNode?.path === node.path;
                const isConnected = connectedPaths.has(node.path);

                const nodeColor = node.path.endsWith(".tsx") || node.path.endsWith(".jsx")
                  ? "#38bdf8"
                  : node.path.endsWith(".ts") || node.path.endsWith(".js")
                  ? "#10b981"
                  : "#f59e0b";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer transition-transform duration-150 hover:scale-110"
                  >
                    <circle
                      r={isSelected ? 16 : isConnected ? 12 : 9}
                      fill={nodeColor}
                      fillOpacity={isSelected ? 0.3 : isConnected ? 0.2 : 0.1}
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 3 : isConnected ? 2 : 1}
                    />
                    <circle r={isSelected ? 6 : 4} fill={nodeColor} />

                    <text
                      y={isSelected ? 26 : 20}
                      textAnchor="middle"
                      fill={isSelected ? "#f4f4f5" : isConnected ? "#e4e4e7" : "#a1a1aa"}
                      fontSize={isSelected ? "11" : "9"}
                      fontFamily="monospace"
                      fontWeight={isSelected ? "bold" : "normal"}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-2 text-[11px] font-mono text-zinc-500 flex justify-between">
            <span>Showing top {layoutNodes.length} file nodes in graph</span>
            <span>Click any node to highlight dependencies</span>
          </div>
        </div>

        {/* Right Pane: Selected Node Dependency Details */}
        <div className="lg:col-span-4 bg-zinc-900/40 p-4 md:p-5 flex flex-col justify-between font-mono text-xs">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Selected Module
                </span>
                <p className="text-zinc-100 font-semibold text-sm break-all mt-0.5 flex items-center gap-2">
                  {selectedNode.name.endsWith(".json") ? (
                    <FileJson className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <FileCode className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <span>{selectedNode.name}</span>
                </p>
                <p className="text-zinc-400 text-[11px] break-all bg-zinc-950 p-1.5 rounded border border-zinc-800/80 mt-1">
                  {selectedNode.path}
                </p>
              </div>

              {/* Node Degrees Grid */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase">Imports (Out)</span>
                  <p className="text-base font-bold text-sky-400 mt-0.5">{selectedNode.outDegree}</p>
                </div>
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase">Imported By (In)</span>
                  <p className="text-base font-bold text-purple-400 mt-0.5">{selectedNode.inDegree}</p>
                </div>
              </div>

              {/* List: Files this file imports */}
              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-sky-400" />
                  <span>Imports ({selectedNode.imports.length})</span>
                </label>

                {selectedNode.imports.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 mt-1 italic">No internal imports</p>
                ) : (
                  <div className="mt-1 max-h-[110px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {selectedNode.imports.map((impPath) => (
                      <div
                        key={impPath}
                        onClick={() => {
                          const targetNode = nodes.find((n) => n.path === impPath);
                          if (targetNode) setSelectedNodeId(targetNode.id);
                        }}
                        className="truncate rounded bg-zinc-950 px-2 py-1 text-[11px] text-sky-300 border border-zinc-800/60 hover:bg-zinc-800/60 cursor-pointer"
                      >
                        {impPath}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* List: Files that import this file */}
              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowLeft className="h-3 w-3 text-purple-400" />
                  <span>Imported By ({selectedNode.importedBy.length})</span>
                </label>

                {selectedNode.importedBy.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 mt-1 italic font-sans">No dependent modules</p>
                ) : (
                  <div className="mt-1 max-h-[110px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {selectedNode.importedBy.map((byPath) => (
                      <div
                        key={byPath}
                        onClick={() => {
                          const targetNode = nodes.find((n) => n.path === byPath);
                          if (targetNode) setSelectedNodeId(targetNode.id);
                        }}
                        className="truncate rounded bg-zinc-950 px-2 py-1 text-[11px] text-purple-300 border border-zinc-800/60 hover:bg-zinc-800/60 cursor-pointer"
                      >
                        {byPath}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">
              Select a node in the graph network to view its dependency details.
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded bg-zinc-950 p-2.5 text-[11px] text-zinc-400 border border-zinc-800">
            <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              Real dependency graph generated by resolving AST import paths against repository files.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
