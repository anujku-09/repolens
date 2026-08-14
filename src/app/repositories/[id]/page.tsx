import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profiles";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { getRepositoryFileContentsSummary } from "@/lib/ingestion/source";
import { getRepositoryAnalysisMap } from "@/lib/analysis/analyze-repository";
import { getSerializedDependencyGraph } from "@/lib/analysis/dependency/build-graph";
import { getRepositorySymbolSummary } from "@/lib/analysis/symbols/build-symbols";
import { getRepositoryArchitectureScore } from "@/lib/analysis/architecture/score-architecture";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { IngestButton } from "@/components/repositories/ingest-button";
import { SourceIngestButton } from "@/components/repositories/source-ingest-button";
import { AstAnalyzeButton } from "@/components/repositories/ast-analyze-button";
import { DependencyGraphButton } from "@/components/repositories/dependency-graph-button";
import { SymbolResolutionButton } from "@/components/repositories/symbol-resolution-button";
import { ArchitectureScoreButton } from "@/components/repositories/architecture-score-button";
import { SymbolIntelligenceCard } from "@/components/repositories/symbol-intelligence-card";
import { DependencyMetricsCard } from "@/components/repositories/dependency-metrics-card";
import { AIIntelligenceCard } from "@/components/repositories/ai-intelligence-card";
import { GuidedOnboardingTour } from "@/components/repositories/guided-onboarding-tour";
import { RefactoringAdvisorCard } from "@/components/repositories/refactoring-advisor-card";
import { RepositorySearchButton } from "@/components/repositories/repository-search-button";
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
  FileCode,
  Cpu,
  GitFork,
  Boxes,
  AlertTriangle,
  ShieldCheck,
  FileX,
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

  // Fetch or auto-create user profile in public.profiles
  const { profile } = await getOrCreateProfile();

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

  // Fetch real symbol resolution summary from public.repository_symbols (Feature 8A)
  const { summary: symbolSummary } = await getRepositorySymbolSummary(repoId);

  // Fetch real architecture score from public.repository_architecture_scores (Feature 8B)
  const { score: archScore } = await getRepositoryArchitectureScore(repoId);

  // Compute stats dynamically from stored repository_files
  const totalFiles = files.filter((f) => f.type === "file").length;
  const totalDirectories = files.filter((f) => f.type === "directory").length;
  const totalCodeSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const status = repository.status || "connected";
  const isIndexed = status === "indexed" || files.length > 0;
  const isIndexing = status === "indexing";
  const isSourceIngested = sourceCount > 0;
  const isAstAnalyzed = Boolean(astSummary && astSummary.analyzedFiles > 0);
  const isGraphBuilt = Boolean(
    serializedGraph.summary && serializedGraph.summary.internalDependencies > 0
  );
  const isSymbolsResolved = Boolean(
    symbolSummary && symbolSummary.totalDefinedSymbols > 0
  );
  const isScoreComputed = Boolean(archScore && archScore.health_score !== undefined);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} profile={profile} />
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

              {isGraphBuilt && (
                <Badge variant="emerald" className="font-mono text-xs gap-1">
                  <GitFork className="h-3 w-3 text-purple-400" />
                  <span>Graph Resolved</span>
                </Badge>
              )}

              {isScoreComputed && archScore && (
                <Badge
                  variant={
                    archScore.health_score >= 80
                      ? "emerald"
                      : archScore.health_score >= 60
                      ? "amber"
                      : "rose"
                  }
                  className="font-mono text-xs gap-1"
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span>Health: {archScore.health_score}/100</span>
                </Badge>
              )}
            </div>

            {repository.description && (
              <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                {repository.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
            <RepositorySearchButton repositoryId={repository.id} />

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

        {/* Pipeline Control Grid (Source, AST, Graph, Symbols & Architecture Score) */}
        {isIndexed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch mb-8">
            {/* Source Ingestion Card */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-zinc-100">1. Source</h3>
                  </div>
                  {isSourceIngested ? (
                    <Badge variant="emerald" className="font-mono text-[9px] px-1.5">
                      Indexed ({sourceCount})
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[9px] text-zinc-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Fetch raw source code contents from GitHub.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                <SourceIngestButton
                  repositoryId={repository.id}
                  isIngested={isSourceIngested}
                  disabled={!isIndexed}
                />
              </div>
            </Card>

            {/* AST Structural Analysis Card */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-sky-400" />
                    <h3 className="text-xs font-semibold text-zinc-100">2. AST Analysis</h3>
                  </div>
                  {isAstAnalyzed ? (
                    <Badge variant="emerald" className="font-mono text-[9px] px-1.5">
                      Analyzed ({astSummary?.analyzedFiles})
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[9px] text-zinc-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Extract imports, exports, functions & classes.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                <AstAnalyzeButton
                  repositoryId={repository.id}
                  isAnalyzed={isAstAnalyzed}
                  disabled={!isSourceIngested}
                />
              </div>
            </Card>

            {/* Dependency Graph Builder Card */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <GitFork className="h-4 w-4 text-purple-400" />
                    <h3 className="text-xs font-semibold text-zinc-100">3. Graph</h3>
                  </div>
                  {isGraphBuilt ? (
                    <Badge variant="emerald" className="font-mono text-[9px] px-1.5">
                      Resolved ({serializedGraph.edges.length})
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[9px] text-zinc-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Resolve imports & detect circular cycles.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                <DependencyGraphButton
                  repositoryId={repository.id}
                  isGraphBuilt={isGraphBuilt}
                  disabled={!isAstAnalyzed}
                />
              </div>
            </Card>

            {/* Symbol Resolution Card (Feature 8A) */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-zinc-100">4. Symbols</h3>
                  </div>
                  {isSymbolsResolved ? (
                    <Badge variant="emerald" className="font-mono text-[9px] px-1.5">
                      Mapped ({symbolSummary?.totalDefinedSymbols})
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[9px] text-zinc-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Map definitions & usage across files.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                <SymbolResolutionButton
                  repositoryId={repository.id}
                  isSymbolsResolved={isSymbolsResolved}
                  disabled={!isGraphBuilt}
                />
              </div>
            </Card>

            {/* Architecture Score Card (Feature 8B) */}
            <Card className="border-zinc-800 bg-zinc-900/50 p-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-zinc-100">5. Health Score</h3>
                  </div>
                  {isScoreComputed && archScore ? (
                    <Badge variant="emerald" className="font-mono text-[9px] px-1.5">
                      Score: {archScore.health_score}/100
                    </Badge>
                  ) : (
                    <Badge variant="mono" className="font-mono text-[9px] text-zinc-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Evaluate coupling, modularity & layer violations.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                <ArchitectureScoreButton
                  repositoryId={repository.id}
                  isScoreComputed={isScoreComputed}
                  disabled={!isGraphBuilt}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Architecture Health Dashboard Card (Feature 8B) */}
        {isScoreComputed && archScore && (
          <Card className="border-emerald-500/30 bg-emerald-500/5 p-5 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xl shadow-inner">
                  {archScore.health_score}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <span>Architecture Quality & Health Dashboard</span>
                    <Badge
                      variant={
                        archScore.health_score >= 80
                          ? "emerald"
                          : archScore.health_score >= 60
                          ? "amber"
                          : "rose"
                      }
                      className="font-mono text-xs"
                    >
                      {archScore.health_score >= 80
                        ? "Excellent Modularity"
                        : archScore.health_score >= 60
                        ? "Moderate Quality"
                        : "High Risk Architecture"}
                    </Badge>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    Evaluated across {archScore.total_files_evaluated} code files with Martin&apos;s Instability Index ({archScore.instability_index || 0.5}).
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Scores Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono mb-6">
              <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Coupling Score</span>
                <p className="text-xl font-bold text-sky-400 mt-0.5">
                  {archScore.coupling_score}/100
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Cohesion Score</span>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">
                  {archScore.cohesion_score}/100
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Modularity Score</span>
                <p className="text-xl font-bold text-purple-400 mt-0.5">
                  {archScore.modularity_score}/100
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase">Avg Instability (I)</span>
                <p className="text-xl font-bold text-amber-400 mt-0.5">
                  {archScore.instability_index || 0.5}
                </p>
              </div>
            </div>

            {/* Layer Violations Warning List */}
            {archScore.analysis_payload?.layerViolations?.length > 0 && (
              <div className="pt-3 border-t border-emerald-500/20 mb-4">
                <label className="text-[11px] font-mono text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>Layer Violations Detected ({archScore.layer_violations_count})</span>
                </label>
                <div className="space-y-1.5 font-mono text-xs">
                  {archScore.analysis_payload.layerViolations.map((v, idx) => (
                    <div
                      key={idx}
                      className="rounded bg-zinc-950 p-2.5 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-400 text-[11px]">{v.violationType}</span>
                        <p className="text-[11px] text-zinc-300">
                          <code className="text-sky-300">{v.sourcePath}</code> &rarr;{" "}
                          <code className="text-rose-300">{v.targetPath}</code>
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-500 italic max-w-xs">{v.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orphan Files List */}
            {archScore.analysis_payload?.orphanFiles?.length > 0 && (
              <div className="pt-3 border-t border-emerald-500/20">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <FileX className="h-3.5 w-3.5 text-purple-400" />
                  <span>Orphan / Unreachable Code Files ({archScore.orphan_files_count})</span>
                </label>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {archScore.analysis_payload.orphanFiles.slice(0, 8).map((orphan) => (
                    <div
                      key={orphan.path}
                      className="inline-flex items-center gap-1.5 rounded bg-zinc-950 px-2.5 py-1 text-purple-300 border border-zinc-800"
                    >
                      <span>{orphan.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Feature 13: Architecture & Refactoring Advisor */}
        <RefactoringAdvisorCard repositoryId={repository.id} />

        {/* Feature 12: Guided Repository Onboarding Tour */}
        <GuidedOnboardingTour
          repositoryId={repository.id}
          repositoryName={repository.full_name}
        />

        {/* Feature 11: AI Codebase Intelligence Payload Generator */}
        <AIIntelligenceCard
          repositoryId={repository.id}
          repositoryFullName={repository.full_name}
        />

        {/* Interactive Symbol Intelligence Metrics Card (Feature 8A) */}
        {isSymbolsResolved && symbolSummary && (
          <SymbolIntelligenceCard symbolSummary={symbolSummary} />
        )}

        {/* Interactive Dependency Intelligence Metrics Card (Feature 7) */}
        {isGraphBuilt && serializedGraph.summary && (
          <DependencyMetricsCard summary={serializedGraph.summary} />
        )}

        {/* Codebase Dependency Network Visualizer */}
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
