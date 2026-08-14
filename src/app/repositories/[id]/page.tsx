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
import { RepositoryDashboardTabs } from "@/components/repositories/repository-dashboard-tabs";
import { PipelineStepperBar } from "@/components/repositories/pipeline-stepper-bar";
import { ArchitectureHealthCard } from "@/components/repositories/architecture-health-card";
import { IngestionStatsGrid } from "@/components/repositories/ingestion-stats-grid";
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

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap self-start md:self-auto">
            <RepositorySearchButton repositoryId={repository.id} />

            {repository.url && (
              <a
                href={repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-300 border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 h-9 px-3 rounded-lg transition-colors shadow-sm shrink-0 cursor-pointer"
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

        {/* Tabbed Repository Dashboard */}
        <RepositoryDashboardTabs
          overviewContent={
            <>
              {/* Sleek Codebase Intelligence Pipeline Stepper Bar */}
              {isIndexed && (
                <PipelineStepperBar
                  repositoryId={repository.id}
                  isIndexed={isIndexed}
                  isSourceIngested={isSourceIngested}
                  sourceCount={sourceCount}
                  isAstAnalyzed={isAstAnalyzed}
                  analyzedFilesCount={astSummary?.analyzedFiles}
                  isGraphBuilt={isGraphBuilt}
                  edgesCount={serializedGraph.edges.length}
                  isSymbolsResolved={isSymbolsResolved}
                  totalDefinedSymbols={symbolSummary?.totalDefinedSymbols}
                  isScoreComputed={isScoreComputed}
                  healthScore={archScore?.health_score}
                />
              )}

              {/* Interactive Ingestion Statistics Grid */}
              <IngestionStatsGrid
                totalFiles={totalFiles}
                totalDirectories={totalDirectories}
                formattedCodeSize={formatBytes(totalCodeSize)}
                defaultBranch={repository.default_branch || "main"}
                githubRepoUrl={repository.url || undefined}
              />

              {/* Interactive Architecture Health Dashboard Card */}
              <ArchitectureHealthCard
                archScore={archScore}
                isScoreComputed={isScoreComputed}
              />

              {/* 5-Minute Guided Repository Onboarding Tour */}
              <GuidedOnboardingTour
                repositoryId={repository.id}
                repositoryName={repository.full_name}
              />
            </>
          }
          dependencyContent={
            <>
              {/* Interactive Dependency Intelligence Metrics Card */}
              {isGraphBuilt && serializedGraph.summary && (
                <DependencyMetricsCard summary={serializedGraph.summary} />
              )}

              {/* Codebase Dependency Network Visualizer */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 font-mono">
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-purple-400" />
                    <span>Interactive Repository Dependency Network</span>
                  </h2>
                  <span className="text-xs text-zinc-500">Real Graph Data</span>
                </div>
                <CodebaseVisualizer
                  graphData={serializedGraph}
                  repositoryFullName={repository.full_name}
                  defaultBranch={repository.default_branch || "main"}
                />
              </div>
            </>
          }
          symbolsAdvisorContent={
            <>
              {/* Symbol Definition & Usage Intelligence Card */}
              {isSymbolsResolved && symbolSummary ? (
                <SymbolIntelligenceCard symbolSummary={symbolSummary} />
              ) : (
                <Card className="border-amber-500/30 bg-amber-500/5 p-5 mb-8 text-center font-mono">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Code2 className="h-8 w-8 text-amber-400 mb-2" />
                    <h3 className="text-sm font-semibold text-zinc-200">Symbol Intelligence Mapping Pending</h3>
                    <p className="text-xs text-zinc-400 max-w-md mt-1">
                      Click &quot;Re-resolve Symbols&quot; in step 4 of the Pipeline Control bar on the Overview tab to map definitions, exported symbols, reference edges, and unused exports across your repository.
                    </p>
                  </div>
                </Card>
              )}

              {/* Architecture & Refactoring Advisor */}
              <RefactoringAdvisorCard repositoryId={repository.id} />

              {/* AI Codebase Intelligence Payload Generator */}
              <AIIntelligenceCard
                repositoryId={repository.id}
                repositoryFullName={repository.full_name}
              />
            </>
          }
          explorerContent={
            /* Interactive File Tree Explorer Component */
            <FileTreeExplorer
              files={files}
              ingestedFileIds={ingestedFileIds}
              analysisMap={analysisMap}
              graphData={serializedGraph}
            />
          }
        />
      </main>
      <Footer />
    </div>
  );
}
