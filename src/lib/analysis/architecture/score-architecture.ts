import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { getSerializedDependencyGraph } from "@/lib/analysis/dependency/build-graph";
import { getRepositorySymbolSummary } from "@/lib/analysis/symbols/build-symbols";
import {
  RepositoryArchitectureScore,
  LayerViolation,
  OrphanFile,
  FileInstabilityMetric,
  ArchitectureAnalysisPayload,
  RepositoryFile,
} from "@/types";

/**
 * Computes deterministic Architecture Health Score (0-100) & Codebase Analytics.
 */
export async function buildRepositoryArchitectureScore(
  repositoryId: string
): Promise<{ success: boolean; score?: RepositoryArchitectureScore; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { success: false, error: "Unauthorized: Please log in first." };
  }

  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    return { success: false, error: "Repository not found or access denied." };
  }

  const files = await getRepositoryFiles(repositoryId);
  const codeFiles = files.filter((f) => f.type === "file");

  if (codeFiles.length === 0) {
    return {
      success: false,
      error: "No code files found in repository. Ingest file tree first.",
    };
  }

  // 1. Fetch Dependency Graph data
  const serializedGraph = await getSerializedDependencyGraph(repositoryId);
  const nodes = serializedGraph.nodes || [];
  const edges = serializedGraph.edges || [];
  const graphSummary = serializedGraph.summary;

  // 2. Fetch Symbol Summary data (Feature 8A)
  const { summary: symbolSummary } = await getRepositorySymbolSummary(repositoryId);

  const nodeMap = new Map<string, typeof nodes[0]>();
  nodes.forEach((n) => nodeMap.set(n.path, n));

  // 3. Compute Martin's Instability Index (Fan-Out / (Fan-In + Fan-Out))
  const instabilityMetrics: FileInstabilityMetric[] = [];
  let totalInstabilitySum = 0;
  let evaluatedFilesCount = 0;

  nodes.forEach((n) => {
    const fanIn = n.inDegree;
    const fanOut = n.outDegree;
    const total = fanIn + fanOut;

    if (total > 0) {
      const inst = fanOut / total;
      instabilityMetrics.push({
        path: n.path,
        fanIn,
        fanOut,
        instability: Math.round(inst * 100) / 100,
      });
      totalInstabilitySum += inst;
      evaluatedFilesCount++;
    }
  });

  const avgInstabilityIndex =
    evaluatedFilesCount > 0
      ? Math.round((totalInstabilitySum / evaluatedFilesCount) * 100) / 100
      : 0.5;

  // 4. Detect Layer Violations
  const layerViolations: LayerViolation[] = [];

  edges.forEach((edge) => {
    const src = edge.source; // e.g. "src/components/shared/navbar.tsx"
    const tgt = edge.target; // e.g. "src/lib/supabase/server.ts"

    // Violation Type 1: Presentation Layer (Components) directly importing Server DB client/service
    if (
      src.includes("/components/") &&
      (tgt.includes("/supabase/server") || tgt.includes("/db/") || tgt.includes("server-only"))
    ) {
      layerViolations.push({
        sourcePath: src,
        targetPath: tgt,
        violationType: "UI Component -> Server DB Direct Import",
        reason:
          "UI component directly imports server DB client. Component should receive data via props or Server Actions.",
      });
    }

    // Violation Type 2: Core Lib/Utils importing UI Components (Upward Dependency Violation)
    if (src.includes("/lib/") && tgt.includes("/components/")) {
      layerViolations.push({
        sourcePath: src,
        targetPath: tgt,
        violationType: "Core Utility -> UI Component Dependency",
        reason:
          "Low-level core library utility imports a high-level UI component, breaking layer decoupling.",
      });
    }
  });

  // 5. Detect Orphan / Unreachable Code Files
  const orphanFiles: OrphanFile[] = [];
  const isExcludedFromOrphanCheck = (path: string) => {
    const p = path.toLowerCase();
    // Exclude static assets, config files, markdown, json, lockfiles, Python entry points, and framework entry points
    return (
      p.startsWith("public/") ||
      p.endsWith(".svg") ||
      p.endsWith(".png") ||
      p.endsWith(".ico") ||
      p.endsWith(".json") ||
      p.endsWith(".md") ||
      p.endsWith(".mjs") ||
      p.endsWith(".css") ||
      p.endsWith(".gitignore") ||
      p.includes("package-lock") ||
      p.includes("config.") ||
      p.endsWith("page.tsx") ||
      p.endsWith("page.js") ||
      p.endsWith("layout.tsx") ||
      p.endsWith("layout.js") ||
      p.endsWith("route.ts") ||
      p.endsWith("route.js") ||
      p.endsWith("middleware.ts") ||
      p.endsWith("middleware.js") ||
      p.endsWith("global-error.tsx") ||
      p.endsWith("error.tsx") ||
      p.endsWith("loading.tsx") ||
      p.endsWith("not-found.tsx") ||
      p.endsWith("index.ts") ||
      p.endsWith("index.js") ||
      p.endsWith("main.py") ||
      p.endsWith("app.py") ||
      p.endsWith("manage.py") ||
      p.endsWith("server.py") ||
      p.endsWith("setup.py") ||
      p.endsWith("__init__.py")
    );
  };

  codeFiles.forEach((file) => {
    const node = nodeMap.get(file.path);
    if (!node) return;

    if (node.inDegree === 0 && node.outDegree === 0 && !isExcludedFromOrphanCheck(file.path)) {
      orphanFiles.push({
        fileId: file.id,
        path: file.path,
      });
    }
  });

  // 6. Compute Sub-Scores (Coupling, Cohesion, Modularity)
  const avgDegree =
    nodes.length > 0
      ? nodes.reduce((acc, n) => acc + n.inDegree + n.outDegree, 0) / nodes.length
      : 0;

  // Coupling Score: higher average degree = tighter coupling = lower score
  const couplingScore = Math.max(0, Math.min(100, Math.round(100 - avgDegree * 8)));

  // Cohesion Score: internal dependency ratio
  const totalDeps = (graphSummary?.internalDependencies || 0) + (graphSummary?.externalDependencies || 0);
  const cohesionRatio = totalDeps > 0 ? (graphSummary?.internalDependencies || 0) / totalDeps : 0.7;
  const cohesionScore = Math.round(cohesionRatio * 100);

  // Modularity Score: clean layering & zero layer violations
  const modularityScore = Math.max(0, Math.min(100, 100 - layerViolations.length * 15));

  // 7. Calculate Overall Health Score (0 - 100)
  const circularCyclesCount = graphSummary?.circularDependencyCount || 0;
  const unusedExportsCount = symbolSummary?.unusedExportsCount || 0;

  const circularCyclesPenalty = Math.min(25, circularCyclesCount * 5);
  const layerViolationsPenalty = Math.min(25, layerViolations.length * 5);
  const unusedExportsPenalty = Math.min(15, Math.floor(unusedExportsCount / 2));
  const orphanFilesPenalty = Math.min(15, orphanFiles.length * 2);

  const totalDeductions =
    circularCyclesPenalty +
    layerViolationsPenalty +
    unusedExportsPenalty +
    orphanFilesPenalty;

  const healthScore = Math.max(0, Math.min(100, 100 - totalDeductions));

  // Top Most Coupled Files
  const mostCoupledFiles = [...nodes]
    .map((n) => ({ path: n.path, totalDegree: n.inDegree + n.outDegree }))
    .sort((a, b) => b.totalDegree - a.totalDegree)
    .slice(0, 5);

  const topInstableFiles = [...instabilityMetrics]
    .sort((a, b) => b.instability - a.instability)
    .slice(0, 5);

  const analysisPayload: ArchitectureAnalysisPayload = {
    layerViolations,
    orphanFiles,
    topInstableFiles,
    mostCoupledFiles,
    scoringBreakdown: {
      baseScore: 100,
      circularCyclesPenalty,
      layerViolationsPenalty,
      unusedExportsPenalty,
      orphanFilesPenalty,
    },
  };

  const recordPayload = {
    repository_id: repositoryId,
    user_id: user.id,
    health_score: healthScore,
    coupling_score: couplingScore,
    cohesion_score: cohesionScore,
    modularity_score: modularityScore,
    instability_index: avgInstabilityIndex,
    total_files_evaluated: codeFiles.length,
    layer_violations_count: layerViolations.length,
    orphan_files_count: orphanFiles.length,
    circular_cycles_count: circularCyclesCount,
    unused_exports_count: unusedExportsCount,
    analysis_payload: analysisPayload,
    updated_at: new Date().toISOString(),
  };

  // 8. Upsert into public.repository_architecture_scores (on conflict update existing record by repository_id)
  const { data: upsertData, error: upsertError } = await supabase
    .from("repository_architecture_scores")
    .upsert(recordPayload, { onConflict: "repository_id" })
    .select("*")
    .single();

  if (upsertError) {
    console.error("[buildRepositoryArchitectureScore Upsert Error]:", upsertError);
    return {
      success: false,
      error: `Failed to persist architecture score: ${upsertError.message}. Ensure 'public.repository_architecture_scores' table exists in Supabase.`,
    };
  }

  return {
    success: true,
    score: upsertData as RepositoryArchitectureScore,
    error: null,
  };
}

/**
 * Fetches existing architecture score for a repository.
 */
export async function getRepositoryArchitectureScore(
  repositoryId: string
): Promise<{ score: RepositoryArchitectureScore | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { score: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("repository_architecture_scores")
    .select("*")
    .eq("repository_id", repositoryId)
    .maybeSingle();

  if (error || !data) {
    return { score: null, error: error?.message || null };
  }

  return {
    score: data as RepositoryArchitectureScore,
    error: null,
  };
}
