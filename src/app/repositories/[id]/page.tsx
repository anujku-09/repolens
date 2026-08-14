import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { getRepositoryFileContentsSummary } from "@/lib/ingestion/source";
import { getRepositoryAnalysisMap } from "@/lib/analysis/analyze-repository";
import { getSerializedDependencyGraph } from "@/lib/analysis/dependency/build-graph";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { IngestButton } from "@/components/repositories/ingest-button";
import { SourceIngestButton } from "@/components/repositories/source-ingest-button";
import { AstAnalyzeButton } from "@/components/repositories/ast-analyze-button";
import { DependencyGraphButton } from "@/components/repositories/dependency-graph-button";
import { FileTreeExplorer } from "@/components/repositories/file-tree-explorer";
import { CodebaseVisualizer } from "@/components/shared/codebase-visualizer";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  GitBranch,
  ExternalLink,
  Files,
  FolderTree,
  HardDrive,
  Code2,
  Database,
  CheckCircle2,
  FileCode,
  Cpu,
  GitFork,
  Boxes,
  AlertTriangle,
  Info,
  Package,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function RepositoryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const repoId = resolvedParams.id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authentication check
  if (!user) {
    redirect("/login");
  }

  // Fetch real repository from database (RLS ensures user ownership)
  const repository = await getRepositoryById(repoId);

  if (!repository) {
    notFound();
  }

  // Fetch real repository file metadata stored in database
  const files = await getRepositoryFiles(repoId);

  // Fetch real source code contents summary from public.repository_file_contents
  const { count: sourceCount, totalBytes: sourceBytes, ingestedFileIds } =
    await getRepositoryFileContentsSummary(repoId);

  // Fetch real AST analysis data from public.repository_file_analysis
  const { analysisMap, summary: astSummary } = await getRepositoryAnalysisMap(repoId);

  // Fetch real dependency graph & import resolution data from public.repository_dependencies
  const serializedGraph = await getSerializedDependencyGraph(repoId);

  // Compute stats dynamically from stored repository_files
  const totalFiles = files.filter((f) => f.type === "file").length;
  const totalDirectories = files.filter((f) => f.type === "directory").length;
  const totalCodeSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Compute Language Breakdown
  const languageStats: Record<string, { count: number; bytes: number }> = {};
  files.forEach((f) => {
    if (f.type === "file" && f.language) {
      if (!languageStats[f.language]) {
        languageStats[f.language] = { count: 0, bytes: 0 };
      }
      languageStats[f.language].count += 1;
      languageStats[f.language].bytes += f.size || 0;
    }
  });

  const languageList = Object.entries(languageStats)
    .map(([lang, stat]) => ({
      name: lang,
      count: stat.count,
      bytes: stat.bytes,
      percent: totalCodeSize > 0 ? (stat.bytes / totalCodeSize) * 100 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const status = repository.status || "connected";
  const isIndexed = status === "indexed" || files.length > 0;
  const isIndexing = status === "indexing";
  const isSourceIngested = sourceCount > 0;
  const isAstAnalyzed = Boolean(astSummary && astSummary.analyzedFiles > 0);
  const isGraphBuilt = Boolean(
    serializedGraph.summary && serializedGraph.summary.internalDependencies > 0
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/repositories"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Repositories</span>
          </Link>
        </div>

        {/* Repository Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-zinc-100">
                {repository.full_name}
              </h1>

              {/* Status Badges */}
              {isIndexed && (
                <Badge variant="emerald" className="font-mono text-xs">
                  File Tree Indexed
                </Badge>
              )}
              {isIndexing && (
                <Badge variant="amber" className="font-mono text-xs animate-pulse">
                  Indexing Tree...
                </Badge>
              )}
              {!isIndexed && status === "connected" && (
                <Badge variant="mono" className="font-mono text-xs text-zinc-400">
                  Connected
                </Badge>
              )}

              {isSourceIngested && (
                <Badge variant="emerald" className="font-mono text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Source Ingested</span>
                </Badge>
              )}

              {isAstAnalyzed && (
                <Badge variant="emerald" className="font-mono text-xs gap-1">
                  <Cpu className="h-3 w-3" />
                  <span>AST Analyzed</span>
                </Badge>
              )}

              {isGraphBuilt && (
                <Badge variant="emerald" className="font-mono text-xs gap-1">
                  <GitFork className="h-3 w-3 text-purple-400" />
                  <span>Graph Resolved</span>
                </Badge>
              )}
            </div>

            {repository.description && (
              <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                {repository.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {repository.url && (
              <a
                href={repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <IngestButton
              repositoryId={repository.id}
              isIndexed={isIndexed}
              isIndexing={isIndexing}
            />
          </div>
        </div>

        {/* Unindexed CTA Notice */}
        {!isIndexed && status !== "indexing" && (
          <Card className="border-emerald-500/30 bg-emerald-500/10 p-5 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">
                    Repository File Ingestion Required
                  </h3>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    This repository has not been ingested yet. Click &quot;Ingest Repository&quot; to fetch and index its complete Git file tree.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Pipeline Control Grid (Source Ingestion, AST Analysis & Dependency Graph) */}
        {isIndexed && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Source Ingestion Card */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-zinc-100">1. Source Ingestion</h3>
                  </div>
                  {isSourceIngested ? (
                    <Badge variant="emerald" className="font-mono text-[10px]">
                      Indexed ({sourceCount} files)
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[10px] text-zinc-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Fetch raw UTF-8 file contents from GitHub Contents API for code files.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80">
                <SourceIngestButton
                  repositoryId={repository.id}
                  isIngested={isSourceIngested}
                  disabled={!isIndexed}
                />
              </div>
            </Card>

            {/* AST Structural Analysis Card */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-zinc-100">2. AST Analysis</h3>
                  </div>
                  {isAstAnalyzed ? (
                    <Badge variant="emerald" className="font-mono text-[10px]">
                      Analyzed ({astSummary?.analyzedFiles} files)
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[10px] text-zinc-500">
                      Pending Source
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Extract imports, exports, functions, classes, and React components via TypeScript Compiler AST.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80">
                <AstAnalyzeButton
                  repositoryId={repository.id}
                  isAnalyzed={isAstAnalyzed}
                  disabled={!isSourceIngested}
                />
              </div>
            </Card>

            {/* Dependency Graph Builder Card */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitFork className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-zinc-100">3. Dependency Graph</h3>
                  </div>
                  {isGraphBuilt ? (
                    <Badge variant="emerald" className="font-mono text-[10px]">
                      Resolved ({serializedGraph.edges.length} edges)
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[10px] text-zinc-500">
                      Pending AST
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Resolve internal import paths, detect circular dependencies, and build repository dependency graph.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80">
                <DependencyGraphButton
                  repositoryId={repository.id}
                  isGraphBuilt={isGraphBuilt}
                  disabled={!isAstAnalyzed}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Dependency Intelligence Metrics & Cycles Card */}
        {isGraphBuilt && serializedGraph.summary && (
          <Card className="border-purple-500/30 bg-purple-500/5 p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitFork className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Dependency Intelligence Metrics</h3>
              </div>
              {serializedGraph.summary.circularDependencyCount > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{serializedGraph.summary.circularDependencyCount} Circular Reference Cycle(s)</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono mb-4">
              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Internal Dependencies</span>
                <p className="text-xl font-bold text-purple-400 mt-0.5">
                  {serializedGraph.summary.internalDependencies}
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">External Packages</span>
                <p className="text-xl font-bold text-sky-400 mt-0.5">
                  {serializedGraph.summary.externalDependencies}
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Unresolved Imports</span>
                <p className="text-xl font-bold text-amber-400 mt-0.5">
                  {serializedGraph.summary.unresolvedDependencies}
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Circular Cycles</span>
                <p className="text-xl font-bold text-rose-400 mt-0.5">
                  {serializedGraph.summary.circularDependencyCount}
                </p>
              </div>
            </div>

            {/* Top Imported Files Breakdown */}
            {serializedGraph.summary.mostImportedFiles.length > 0 && (
              <div className="pt-3 border-t border-purple-500/20">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                  Top Imported Files (Most Depended On)
                </label>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {serializedGraph.summary.mostImportedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="inline-flex items-center gap-2 rounded bg-zinc-950 px-2.5 py-1 text-zinc-300 border border-zinc-800"
                    >
                      <span className="truncate max-w-[200px]">{file.path}</span>
                      <span className="text-purple-400 font-bold">({file.count} imports)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Package Dependencies Breakdown */}
            {serializedGraph.summary.externalPackages.length > 0 && (
              <div className="pt-3 mt-3 border-t border-purple-500/20">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Package className="h-3.5 w-3.5 text-sky-400" />
                  <span>External Package Dependencies ({serializedGraph.summary.externalPackages.length})</span>
                </label>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {serializedGraph.summary.externalPackages.slice(0, 10).map((pkg) => (
                    <div
                      key={pkg.name}
                      className="inline-flex items-center gap-2 rounded bg-zinc-950 px-2 py-1 text-sky-300 border border-zinc-800"
                    >
                      <span className="font-semibold">{pkg.name}</span>
                      <span className="text-zinc-500">({pkg.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Codebase Dependency Network Visualizer (Feature 7) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-purple-400" />
              <span>Interactive Repository Dependency Network</span>
            </h2>
            <span className="text-xs text-zinc-500 font-mono">Real Graph Data</span>
          </div>
          <CodebaseVisualizer
            graphData={serializedGraph}
            repositoryFullName={repository.full_name}
            defaultBranch={repository.default_branch || "main"}
          />
        </div>

        {/* Real Ingestion Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <Files className="h-4 w-4 text-emerald-400" />
                <span>Total Files</span>
              </CardDescription>
              <CardTitle className="text-2xl font-mono text-zinc-100 mt-1">
                {totalFiles.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <FolderTree className="h-4 w-4 text-sky-400" />
                <span>Directories</span>
              </CardDescription>
              <CardTitle className="text-2xl font-mono text-zinc-100 mt-1">
                {totalDirectories.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <HardDrive className="h-4 w-4 text-amber-400" />
                <span>Total Code Size</span>
              </CardDescription>
              <CardTitle className="text-2xl font-mono text-zinc-100 mt-1">
                {formatBytes(totalCodeSize)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <GitBranch className="h-4 w-4 text-purple-400" />
                <span>Default Branch</span>
              </CardDescription>
              <CardTitle className="text-xl font-mono text-zinc-100 mt-1 truncate">
                {repository.default_branch || "main"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Extracted AST Facts Summary Grid */}
        {isAstAnalyzed && astSummary && (
          <Card className="border-zinc-800 bg-zinc-900/40 p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Extracted Code Structure Metrics
                </h3>
              </div>
              {astSummary.unsupportedLanguages.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <Info className="h-3 w-3" />
                  <span>{astSummary.unsupportedLanguages.join(", ")}: AST parser not available yet</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase">Analyzed Files</span>
                <p className="text-lg font-bold text-sky-400 mt-0.5">{astSummary.analyzedFiles}</p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase">Imports</span>
                <p className="text-lg font-bold text-zinc-200 mt-0.5">{astSummary.imports}</p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase">Exports</span>
                <p className="text-lg font-bold text-zinc-200 mt-0.5">{astSummary.exports}</p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase">Functions</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{astSummary.functions}</p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase">Classes</span>
                <p className="text-lg font-bold text-purple-400 mt-0.5">{astSummary.classes}</p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase">React Components</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">{astSummary.components}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Primary Languages Breakdown */}
        {languageList.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/40 p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Primary Languages Breakdown</h3>
            </div>

            <div className="space-y-3">
              {/* Stacked Percentage Bar */}
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                {languageList.slice(0, 6).map((lang, i) => {
                  const colors = [
                    "bg-emerald-500",
                    "bg-sky-500",
                    "bg-amber-500",
                    "bg-purple-500",
                    "bg-rose-500",
                    "bg-indigo-500",
                  ];
                  return (
                    <div
                      key={lang.name}
                      style={{ width: `${Math.max(lang.percent, 1)}%` }}
                      className={`${colors[i % colors.length]} transition-all`}
                      title={`${lang.name}: ${lang.percent.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* Language Badges Grid */}
              <div className="flex flex-wrap gap-4 pt-1 text-xs font-mono text-zinc-400">
                {languageList.map((lang) => (
                  <div key={lang.name} className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">{lang.name}:</span>
                    <span>
                      {lang.count} files ({formatBytes(lang.bytes)})
                    </span>
                    <span className="text-zinc-500">({lang.percent.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Interactive File Tree Explorer Component */}
        <FileTreeExplorer
          files={files}
          ingestedFileIds={ingestedFileIds}
          analysisMap={analysisMap}
          graphData={serializedGraph}
        />
      </main>
      <Footer />
    </div>
  );
}
