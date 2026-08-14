"use client";

import { useState, useMemo, useRef, useEffect, MouseEvent } from "react";
import { SerializedGraphData, ChangeImpactResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  FileCode,
  FileJson,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Move,
  Filter,
  Columns,
  Circle,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface CodebaseVisualizerProps {
  graphData?: SerializedGraphData | null;
  repositoryFullName?: string;
  defaultBranch?: string;
  impactResult?: ChangeImpactResult | null;
}

export type LayoutMode = "concentric" | "columns";

/**
 * Computes a clean short path label for SVG node rendering that includes parent directory context
 * (e.g. "src/app/repositories/[id]/page.tsx" -> "repositories/[id]/page.tsx")
 */
function getShortPathLabel(fullPath: string): string {
  if (!fullPath) return "";
  const parts = fullPath.replace(/\\/g, "/").replace(/^\/+/, "").split("/");
  if (parts.length <= 2) return fullPath;
  return parts.slice(-2).join("/");
}

export function CodebaseVisualizer({
  graphData,
  repositoryFullName = "repository",
  defaultBranch = "main",
  impactResult = null,
}: CodebaseVisualizerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("concentric");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];
  const summary = graphData?.summary || null;

  // Listen to browser native fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Toggle native browser fullscreen / CSS fullscreen modal overlay
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => {
          console.warn("[Fullscreen API Error, falling back to CSS Overlay]:", err);
          setIsFullscreen((prev) => !prev);
        });
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => setIsFullscreen(false));
    }
  };

  // Filter nodes based on search query & connected-only toggle
  const filteredNodes = useMemo(() => {
    let list = nodes;

    if (showConnectedOnly) {
      list = list.filter((n) => n.inDegree > 0 || n.outDegree > 0);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q) ||
        (n.language && n.language.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery, showConnectedOnly]);

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

  // Calculate layout coordinates for ALL filtered nodes (Concentric or Columns mode)
  const layoutNodes = useMemo(() => {
    const list = filteredNodes;
    const count = list.length;
    if (count === 0) return [];

    const result: ((typeof list)[0] & { x: number; y: number; ring: string; displayLabel: string })[] = [];

    if (layoutMode === "columns") {
      // Columns Layout: App Pages (Col 1) -> Components (Col 2) -> Lib/Types (Col 3)
      const pageNodes = list.filter((n) => !n.path.includes("/components/") && !n.path.includes("/lib/") && !n.path.includes("/types/"));
      const componentNodes = list.filter((n) => n.path.includes("/components/"));
      const coreNodes = list.filter((n) => n.path.includes("/lib/") || n.path.includes("/types/"));

      const col1X = 160;
      const col2X = 580;
      const col3X = 1000;
      const startY = 100;
      const spacingY = 55;

      pageNodes.forEach((node, i) => {
        result.push({
          ...node,
          x: col1X,
          y: startY + i * spacingY,
          ring: "page",
          displayLabel: getShortPathLabel(node.path),
        });
      });

      componentNodes.forEach((node, i) => {
        result.push({
          ...node,
          x: col2X,
          y: startY + i * spacingY,
          ring: "component",
          displayLabel: getShortPathLabel(node.path),
        });
      });

      coreNodes.forEach((node, i) => {
        result.push({
          ...node,
          x: col3X,
          y: startY + i * spacingY,
          ring: "core",
          displayLabel: getShortPathLabel(node.path),
        });
      });

      return result;
    }

    // Concentric Ring Layout
    const centerX = 650;
    const centerY = 450;

    const coreNodes: typeof list = [];
    const componentNodes: typeof list = [];
    const pageNodes: typeof list = [];

    list.forEach((node) => {
      const p = node.path;
      if (p.includes("/lib/") || p.includes("/types/") || node.inDegree >= 8) {
        coreNodes.push(node);
      } else if (p.includes("/components/")) {
        componentNodes.push(node);
      } else {
        pageNodes.push(node);
      }
    });

    // Inner Core Ring (Radius 160px)
    coreNodes.forEach((node, i) => {
      const angle = (i / Math.max(coreNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const radius = 160;
      result.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ring: "core",
        displayLabel: getShortPathLabel(node.path),
      });
    });

    // Middle Components Ring (Radius 300px)
    componentNodes.forEach((node, i) => {
      const angle = (i / Math.max(componentNodes.length, 1)) * 2 * Math.PI - Math.PI / 4;
      const radius = 300;
      result.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ring: "component",
        displayLabel: getShortPathLabel(node.path),
      });
    });

    // Outer Pages Ring (Radius 420px)
    pageNodes.forEach((node, i) => {
      const angle = (i / Math.max(pageNodes.length, 1)) * 2 * Math.PI;
      const radius = 420;
      result.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ring: "page",
        displayLabel: getShortPathLabel(node.path),
      });
    });

    return result;
  }, [filteredNodes, layoutMode]);

  const layoutMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    layoutNodes.forEach((n) => map.set(n.path, { x: n.x, y: n.y }));
    return map;
  }, [layoutNodes]);

  // Compute Dynamic ViewBox bounds so NO node is ever clipped outside SVG screen
  const viewBoxString = useMemo(() => {
    if (layoutNodes.length === 0) return "0 0 1200 800";

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    layoutNodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });

    // Add margin around extreme nodes
    const margin = 100;
    const x = Math.floor(minX - margin);
    const y = Math.floor(minY - margin);
    const w = Math.ceil(maxX - minX + margin * 2);
    const h = Math.ceil(maxY - minY + margin * 2);

    return `${x} ${y} ${Math.max(w, 800)} ${Math.max(h, 600)}`;
  }, [layoutNodes]);

  // Mouse Drag / Pan Handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

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

  const hoveredNode = hoveredNodeId ? layoutNodes.find((n) => n.id === hoveredNodeId) : null;

  return (
    <div
      ref={wrapperRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950 w-screen h-screen rounded-none border-0 overflow-hidden flex flex-col font-sans"
          : "w-full rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-sans transition-all duration-200"
      }
    >
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-3 gap-3 shrink-0">
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

          {/* Full Screen Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-mono text-xs font-semibold transition-colors cursor-pointer ml-1"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Fullscreen Canvas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Graph Canvas & Inspector Layout */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden ${isFullscreen ? "h-[calc(100vh-57px)]" : "min-h-135"}`}>
        {/* Left Interactive SVG Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`lg:col-span-8 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-950 p-4 relative flex flex-col justify-between overflow-hidden ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {/* Canvas Search & Mode Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 z-20 pointer-events-auto">
            <div className="relative flex-1 min-w-45 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search module by name or path..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              {/* Layout Mode Selector (Concentric vs Columns) */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setLayoutMode("concentric")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                    layoutMode === "concentric"
                      ? "bg-purple-500/20 text-purple-300 font-semibold"
                      : "hover:text-zinc-200"
                  }`}
                  title="Concentric Network Layout"
                >
                  <Circle className="h-3 w-3" />
                  <span>Rings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("columns")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                    layoutMode === "columns"
                      ? "bg-purple-500/20 text-purple-300 font-semibold"
                      : "hover:text-zinc-200"
                  }`}
                  title="Architectural Columns Layout"
                >
                  <Columns className="h-3 w-3" />
                  <span>Columns</span>
                </button>
              </div>

              {/* Connected Only Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowConnectedOnly(!showConnectedOnly)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${
                  showConnectedOnly
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Filter className="h-3 w-3" />
                <span>{showConnectedOnly ? "Edges Only" : "All Files"}</span>
              </button>

              {/* Zoom & Pan Controls */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 2.5))}
                  className="p-1 hover:text-zinc-100 rounded hover:bg-zinc-800"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.3))}
                  className="p-1 hover:text-zinc-100 rounded hover:bg-zinc-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="p-1 hover:text-zinc-100 rounded hover:bg-zinc-800 flex items-center gap-1"
                  title="Reset View & Auto Fit"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="text-[10px] hidden sm:inline">Fit</span>
                </button>
                <span className="px-1.5 text-[11px] text-zinc-500 font-bold">
                  {(zoomLevel * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Responsive SVG Canvas */}
          <div className="flex-1 min-h-[460px] flex items-center justify-center overflow-hidden relative select-none">
            <svg
              viewBox={viewBoxString}
              className="w-full h-full transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              }}
            >
              <defs>
                {/* Arrowhead Markers */}
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="16"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#52525b" opacity="0.5" />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="10"
                  markerHeight="7"
                  refX="18"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
                </marker>
                <marker
                  id="arrowhead-in"
                  markerWidth="10"
                  markerHeight="7"
                  refX="18"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#c084fc" />
                </marker>

                {/* Concentric Glow Filters */}
                <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Concentric Layer Guide Rings (Rendered only in concentric mode) */}
              {layoutMode === "concentric" && (
                <>
                  <circle cx="650" cy="450" r="160" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <circle cx="650" cy="450" r="300" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <circle cx="650" cy="450" r="420" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.25" />
                </>
              )}

              {/* Smooth Curved Edge Lines */}
              {edges.map((edge) => {
                const src = layoutMap.get(edge.source);
                const tgt = layoutMap.get(edge.target);
                // GUARANTEE: Only draw line if BOTH source and target nodes exist in layoutMap!
                if (!src || !tgt) return null;

                const isSourceSelected = selectedNode && edge.source === selectedNode.path;
                const isTargetSelected = selectedNode && edge.target === selectedNode.path;
                const isConnectedToSelected = isSourceSelected || isTargetSelected;

                // Compute smooth control point for curve
                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;
                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const norm = Math.sqrt(dx * dx + dy * dy) || 1;
                const controlX = midX - (dy / norm) * 20;
                const controlY = midY + (dx / norm) * 20;

                const strokeColor = isSourceSelected
                  ? "#38bdf8"
                  : isTargetSelected
                  ? "#c084fc"
                  : "#27272a";

                const strokeMarker = isSourceSelected
                  ? "url(#arrowhead-active)"
                  : isTargetSelected
                  ? "url(#arrowhead-in)"
                  : "url(#arrowhead)";

                return (
                  <path
                    key={edge.id}
                    d={`M ${src.x} ${src.y} Q ${controlX} ${controlY} ${tgt.x} ${tgt.y}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isConnectedToSelected ? 2.5 : 1}
                    strokeDasharray={isConnectedToSelected ? undefined : "3 3"}
                    opacity={isConnectedToSelected ? 0.95 : 0.25}
                    markerEnd={strokeMarker}
                  />
                );
              })}

              {/* Network Node Elements */}
              {layoutNodes.map((node) => {
                const isSelected = selectedNode?.path === node.path;
                const isConnected = connectedPaths.has(node.path);

                // Feature 9: Impact Analysis Styling Overrides
                let isTargetNode = false;
                let isDirectNode = false;
                let isTransitiveNode = false;
                let isImpactMode = false;

                if (impactResult) {
                  isImpactMode = true;
                  isTargetNode = node.path === impactResult.targetFile.path || node.id === impactResult.targetFile.id;
                  isDirectNode = impactResult.directDependents.some((d) => d.path === node.path || d.id === node.id);
                  isTransitiveNode = impactResult.transitiveDependents.some((t) => t.path === node.path || t.id === node.id);
                }

                const isAffectedByImpact = isTargetNode || isDirectNode || isTransitiveNode;

                // Color code nodes logically by layer / type or impact role
                let nodeColor = node.path.includes("/components/")
                  ? "#34d399" // Emerald for components
                  : node.path.includes("/lib/") || node.path.includes("/types/")
                  ? "#c084fc" // Purple for core logic
                  : node.path.endsWith(".json") || node.path.endsWith(".css")
                  ? "#fbbf24" // Amber for configs/styles
                  : "#38bdf8"; // Cyan for pages/routes

                if (isImpactMode) {
                  if (isTargetNode) nodeColor = "#f43f5e"; // Rose red for target
                  else if (isDirectNode) nodeColor = "#fb7185"; // Soft rose for direct (L1)
                  else if (isTransitiveNode) nodeColor = "#fbbf24"; // Amber for transitive (L2+)
                  else nodeColor = "#52525b"; // Dim gray for unrelated
                }

                const nodeOpacity = isImpactMode ? (isAffectedByImpact ? 1.0 : 0.15) : 1.0;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    opacity={nodeOpacity}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer transition-opacity duration-300"
                  >
                    {/* Glowing Selection / Target Aura */}
                    {(isSelected || isTargetNode) && (
                      <circle
                        r={isTargetNode ? "24" : "20"}
                        fill={nodeColor}
                        fillOpacity={isTargetNode ? "0.35" : "0.2"}
                        stroke={nodeColor}
                        strokeWidth="2.5"
                        filter="url(#glow-cyan)"
                      />
                    )}

                    {/* Outer Ring */}
                    <circle
                      r={isTargetNode ? 16 : isSelected ? 14 : isDirectNode ? 12 : isConnected ? 10 : 8}
                      fill={nodeColor}
                      fillOpacity={isTargetNode ? 0.6 : isSelected ? 0.4 : isDirectNode ? 0.35 : isConnected ? 0.25 : 0.15}
                      stroke={nodeColor}
                      strokeWidth={isTargetNode ? 3.5 : isSelected ? 3 : isDirectNode ? 2.5 : isConnected ? 2 : 1}
                    />

                    {/* Center Core Dot */}
                    <circle r={isTargetNode ? 6 : isSelected ? 5 : 3.5} fill={nodeColor} />

                    {/* Node Label Text with Directory Context */}
                    <text
                      y={isTargetNode ? 28 : isSelected ? 26 : 20}
                      textAnchor="middle"
                      fill={isTargetNode ? "#ffe4e6" : isSelected ? "#f4f4f5" : isAffectedByImpact ? "#f4f4f5" : isConnected ? "#e4e4e7" : "#71717a"}
                      fontSize={isTargetNode ? "12" : isSelected ? "11" : "9"}
                      fontFamily="monospace"
                      fontWeight={isTargetNode || isSelected || isAffectedByImpact ? "bold" : "normal"}
                    >
                      {isTargetNode ? `🎯 ${node.displayLabel}` : isDirectNode ? `L1: ${node.displayLabel}` : node.displayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredNode && (
              <div className="absolute top-4 left-4 pointer-events-none rounded-lg border border-zinc-800 bg-zinc-950/90 p-2.5 shadow-xl font-mono text-[11px] text-zinc-200 z-30 max-w-xs backdrop-blur-md">
                <p className="font-semibold text-emerald-400">{hoveredNode.name}</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{hoveredNode.path}</p>
                <div className="flex gap-3 text-[10px] text-zinc-400 mt-1 pt-1 border-t border-zinc-800">
                  <span>Out: <strong className="text-sky-400">{hoveredNode.outDegree}</strong></span>
                  <span>In: <strong className="text-purple-400">{hoveredNode.inDegree}</strong></span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] font-mono text-zinc-500 flex justify-between items-center z-10 pointer-events-auto">
            <div className="flex items-center gap-2">
              <Move className="h-3 w-3 text-zinc-600" />
              <span>Click & Drag to pan &bull; Scroll / Zoom controls</span>
            </div>
            <span>Showing all {layoutNodes.length} code files</span>
          </div>
        </div>

        {/* Right Inspector Pane: Selected Node Dependency Details */}
        <div className="lg:col-span-4 bg-zinc-900/40 p-4 md:p-5 flex flex-col justify-between font-mono text-xs overflow-y-auto">
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
                  <div className="mt-1 max-h-30 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
                  <div className="mt-1 max-h-[120px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
