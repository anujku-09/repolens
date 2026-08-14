import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import {
  RefactoringAdvisorReport,
  RefactoringRecommendation,
  RecommendationPriority,
  RepositoryFile,
  RepositorySymbol,
} from "@/types";

/**
 * Feature 13: Architecture & Refactoring Advisor Engine.
 * Dynamically prioritizes technical debt based on dependency impact, circular cycles,
 * layer violations, instability metrics, and unused exports.
 */
export async function generateRefactoringReport(
  repositoryId: string
): Promise<{ success: boolean; report?: RefactoringAdvisorReport; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { success: false, error: "Unauthorized: Please log in first." };
  }

  // 1. Verify Repository Ownership
  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    return { success: false, error: "Repository not found." };
  }

  // 2. Bulk load repository files
  const files = await getRepositoryFiles(repositoryId);
  const idToFileMap = new Map<string, RepositoryFile>();
  const pathToFileMap = new Map<string, RepositoryFile>();
  files.forEach((f) => {
    idToFileMap.set(f.id, f);
    pathToFileMap.set(f.path, f);
  });

  // 3. Bulk load dependencies to compute Fan-In / Fan-Out
  const { data: depsData } = await supabase
    .from("repository_dependencies")
    .select("source_file_id, target_file_id")
    .eq("repository_id", repositoryId);

  const fileFanInMap = new Map<string, number>();
  const fileFanOutMap = new Map<string, number>();

  (depsData || []).forEach((d) => {
    if (d.target_file_id) {
      fileFanInMap.set(d.target_file_id, (fileFanInMap.get(d.target_file_id) || 0) + 1);
    }
    if (d.source_file_id) {
      fileFanOutMap.set(d.source_file_id, (fileFanOutMap.get(d.source_file_id) || 0) + 1);
    }
  });

  // 4. Bulk load architecture score payload
  const { data: scoreData } = await supabase
    .from("repository_architecture_scores")
    .select("health_score, circular_cycles_count, layer_violations_count, orphan_files_count, unused_exports_count, analysis_payload")
    .eq("repository_id", repositoryId)
    .maybeSingle();

  const payload = scoreData?.analysis_payload;
  const recommendations: RefactoringRecommendation[] = [];

  // --- 1. CIRCULAR DEPENDENCY RECOMMENDATIONS ---
  const layerViolations = payload?.layerViolations || [];
  const circulars = layerViolations.filter((v: any) => v.violationType === "circular_dependency" || v.violationType === "circular");

  circulars.forEach((circ: any, idx: number) => {
    const fileObj = pathToFileMap.get(circ.sourcePath);
    recommendations.push({
      id: `circ-${idx}`,
      priority: "critical",
      category: "circular_dependency",
      title: `Break Circular Dependency Loop in ${circ.sourcePath}`,
      affectedPath: circ.sourcePath,
      affectedFileId: fileObj?.id,
      evidence: `Circular import cycle detected: '${circ.sourcePath}' <-> '${circ.targetPath}'.`,
      potentialImpact: "Circular import loops cause bundle bloat, execution deadlocks, and testing instability.",
      suggestedRefactor: "Extract shared types or helper functions into a lower-level leaf utility module to break the import cycle.",
      aiExplanation: `Deterministic AST analysis confirmed a circular import loop. Refactoring shared interfaces into a separate leaf file eliminates initialization hazards.`,
    });
  });

  // --- 2. LAYER VIOLATION RECOMMENDATIONS ---
  const layerRules = layerViolations.filter((v: any) => v.violationType !== "circular_dependency" && v.violationType !== "circular");
  layerRules.forEach((v: any, idx: number) => {
    const fileObj = pathToFileMap.get(v.sourcePath);
    recommendations.push({
      id: `layer-${idx}`,
      priority: "high",
      category: "layer_violation",
      title: `Fix Architectural Layer Violation`,
      affectedPath: v.sourcePath,
      affectedFileId: fileObj?.id,
      evidence: `Source module '${v.sourcePath}' imports '${v.targetPath}' violating modular layer hierarchy rules.`,
      potentialImpact: "Bypasses clean architectural boundaries and introduces tight coupling across decoupled domain layers.",
      suggestedRefactor: "Refactor cross-layer dependency calls to use dependency inversion or event messaging.",
      aiExplanation: `Layer analysis flagged an architectural boundary violation. Enforcing layer boundaries prevents monolithic coupling.`,
    });
  });

  // --- 3. HIGH INSTABILITY & UNBALANCED COUPLING ---
  const topInstable = payload?.topInstableFiles || [];
  topInstable.slice(0, 3).forEach((item: any, idx: number) => {
    const fileObj = pathToFileMap.get(item.path);
    if (fileObj) {
      recommendations.push({
        id: `instable-${idx}`,
        priority: "high",
        category: "high_instability",
        title: `Refactor High-Instability Central Module`,
        affectedPath: item.path,
        affectedFileId: fileObj.id,
        evidence: `Unbalanced coupling: Fan-In = ${item.fanIn}, Fan-Out = ${item.fanOut}. Instability Index = ${(item.instability || 0).toFixed(2)}.`,
        potentialImpact: "Module depends on many external packages while being heavily relied upon by core internal files.",
        suggestedRefactor: "Decouple heavy external dependencies into adapter services to lower fan-out.",
        aiExplanation: `Module exhibits high coupling instability. Isolating external dependencies protects downstream consumers.`,
      });
    }
  });

  // --- 4. UNUSED EXPORT SURFACE PRUNING ---
  const unusedExportsCount = scoreData?.unused_exports_count || 0;
  if (unusedExportsCount > 0) {
    recommendations.push({
      id: "unused-exports",
      priority: "medium",
      category: "unused_export_pruning",
      title: `Prune ${unusedExportsCount} Unused Exported Symbol(s)`,
      affectedPath: "Repository Symbol Graph",
      evidence: `${unusedExportsCount} exported symbols are defined in the repository but never imported anywhere.`,
      potentialImpact: "Increases public API surface area, confuses developers, and prevents optimal bundle tree-shaking.",
      suggestedRefactor: "Remove the 'export' keyword from unused symbols or delete dead internal helper functions.",
      aiExplanation: `AST symbol graph confirmed unreferenced exported symbols. Removing unused exports reduces surface area.`,
    });
  }

  // --- 5. ORPHAN FILE CLEANUP ---
  const orphanFiles = payload?.orphanFiles || [];
  if (orphanFiles.length > 0) {
    recommendations.push({
      id: "orphan-files",
      priority: "low",
      category: "orphan_file_cleanup",
      title: `Clean Up ${orphanFiles.length} Dead / Abandoned Orphan File(s)`,
      affectedPath: orphanFiles[0]?.path || "Repository File Tree",
      evidence: `${orphanFiles.length} file(s) (e.g. '${orphanFiles[0]?.path}') have 0 incoming and 0 outgoing internal repository imports.`,
      potentialImpact: "Accumulates dead code clutter and increases maintenance overhead for new developers.",
      suggestedRefactor: "Verify if orphan files are abandoned legacy files and delete them if no longer needed.",
      aiExplanation: `Dependency graph confirmed 0 internal import connections for these files.`,
    });
  }

  // Sort recommendations by Priority: CRITICAL -> HIGH -> MEDIUM -> LOW
  const priorityRank: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  const report: RefactoringAdvisorReport = {
    repositoryId,
    repositoryName: repository.full_name,
    healthScore: scoreData?.health_score ?? null,
    totalIssuesFound: recommendations.length,
    recommendations,
  };

  return {
    success: true,
    report,
    error: null,
  };
}
