import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import {
  ChangeImpactResult,
  ImpactRisk,
  AffectedFileItem,
  AffectedSymbolItem,
  AffectedComponentItem,
  AffectedRouteItem,
  RepositoryFile,
  RepositorySymbol,
  RepositorySymbolReference,
} from "@/types";

/**
 * Feature 9: Deterministic Change Impact & Blast Radius Analyzer Engine.
 * Builds an in-memory reverse dependency graph and performs BFS traversal.
 * Identifies direct & transitive dependent files, affected symbols, React components, and Next.js routes.
 */
export async function analyzeFileImpact(
  repositoryId: string,
  fileId: string
): Promise<{ success: boolean; result?: ChangeImpactResult; error: string | null }> {
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
    return { success: false, error: "Repository not found or access denied." };
  }

  // 2. Fetch all repository files in bulk
  const allFiles = await getRepositoryFiles(repositoryId);
  if (allFiles.length === 0) {
    return { success: false, error: "Repository file tree not indexed yet." };
  }

  const idToFileMap = new Map<string, RepositoryFile>();
  const pathToFileMap = new Map<string, RepositoryFile>();
  allFiles.forEach((f) => {
    idToFileMap.set(f.id, f);
    pathToFileMap.set(f.path, f);
  });

  const targetFile = idToFileMap.get(fileId);
  if (!targetFile) {
    return { success: false, error: "Selected target file not found in repository." };
  }

  if (targetFile.type === "directory") {
    return { success: false, error: "Change impact analysis is designed for single code files, not directories." };
  }

  // 3. Bulk load repository dependencies (edges)
  const { data: depsData, error: depsError } = await supabase
    .from("repository_dependencies")
    .select("source_file_id, target_file_id, dependency_type")
    .eq("repository_id", repositoryId);

  if (depsError) {
    console.error("[analyzeFileImpact] Error loading dependencies:", depsError);
  }

  const dependencies = depsData || [];

  // 4. Bulk load repository symbols & symbol references
  const { data: symbolsData } = await supabase
    .from("repository_symbols")
    .select("*")
    .eq("repository_id", repositoryId);

  const symbols = (symbolsData || []) as RepositorySymbol[];
  const symbolIdMap = new Map<string, RepositorySymbol>();
  symbols.forEach((s) => symbolIdMap.set(s.id, s));

  const { data: refsData } = await supabase
    .from("repository_symbol_references")
    .select("*")
    .eq("repository_id", repositoryId);

  const references = (refsData || []) as RepositorySymbolReference[];

  // 5. Bulk load architecture score to check for circular dependency cycles
  const { data: scoreData } = await supabase
    .from("repository_architecture_scores")
    .select("analysis_payload, circular_cycles_count")
    .eq("repository_id", repositoryId)
    .maybeSingle();

  // 6. Build In-Memory Reverse Adjacency Graph (targetFile -> files that import targetFile)
  // reverseAdj: Map<targetFileId, Set<referencingFileId>>
  const reverseAdj = new Map<string, Set<string>>();
  // forwardAdj: Map<sourceFileId, Set<targetFileId>> for Fan-Out
  const forwardAdj = new Map<string, Set<string>>();

  dependencies.forEach((dep) => {
    if (dep.dependency_type === "internal" && dep.target_file_id && dep.source_file_id) {
      // Reverse Edge
      if (!reverseAdj.has(dep.target_file_id)) {
        reverseAdj.set(dep.target_file_id, new Set());
      }
      reverseAdj.get(dep.target_file_id)!.add(dep.source_file_id);

      // Forward Edge
      if (!forwardAdj.has(dep.source_file_id)) {
        forwardAdj.set(dep.source_file_id, new Set());
      }
      forwardAdj.get(dep.source_file_id)!.add(dep.target_file_id);
    }
  });

  // 7. BFS Downstream Traversal starting from targetFile.id
  // visitedDepthMap: Map<fileId, minDepth>
  const visitedDepthMap = new Map<string, number>();
  const queue: { fileId: string; depth: number }[] = [{ fileId: targetFile.id, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseAdj.get(current.fileId);

    if (dependents) {
      dependents.forEach((depId) => {
        if (depId !== targetFile.id && !visitedDepthMap.has(depId)) {
          const nextDepth = current.depth + 1;
          visitedDepthMap.set(depId, nextDepth);
          queue.push({ fileId: depId, depth: nextDepth });
        }
      });
    }
  }

  // 8. Separate Direct (Depth 1) vs Transitive (Depth > 1) Dependents
  const directDependents: AffectedFileItem[] = [];
  const transitiveDependents: AffectedFileItem[] = [];

  visitedDepthMap.forEach((depth, depFileId) => {
    const fileObj = idToFileMap.get(depFileId);
    if (fileObj) {
      const item: AffectedFileItem = {
        id: fileObj.id,
        path: fileObj.path,
        name: fileObj.name,
        depth,
      };

      if (depth === 1) {
        directDependents.push(item);
      } else {
        transitiveDependents.push(item);
      }
    }
  });

  // Sort files by path for deterministic presentation
  directDependents.sort((a, b) => a.path.localeCompare(b.path));
  transitiveDependents.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));

  const allAffectedFileIds = new Set<string>([targetFile.id, ...visitedDepthMap.keys()]);

  // 9. Identify Affected Symbols
  // Symbols defined in targetFile that have references in affected files
  const targetSymbols = symbols.filter((s) => s.defining_file_id === targetFile.id);
  const symbolRefCounts = new Map<string, number>();

  references.forEach((ref) => {
    if (symbolIdMap.has(ref.symbol_id) && allAffectedFileIds.has(ref.referencing_file_id)) {
      const sym = symbolIdMap.get(ref.symbol_id)!;
      if (sym.defining_file_id === targetFile.id) {
        symbolRefCounts.set(sym.id, (symbolRefCounts.get(sym.id) || 0) + 1);
      }
    }
  });

  const affectedSymbols: AffectedSymbolItem[] = targetSymbols
    .map((sym) => ({
      symbol_name: sym.symbol_name,
      kind: sym.symbol_kind,
      defining_path: targetFile.path,
      reference_count: symbolRefCounts.get(sym.id) || 0,
    }))
    .sort((a, b) => b.reference_count - a.reference_count || a.symbol_name.localeCompare(b.symbol_name));

  // 10. Identify Affected React Components
  const affectedComponents: AffectedComponentItem[] = [];
  const compDedupeSet = new Set<string>();

  symbols.forEach((sym) => {
    if (allAffectedFileIds.has(sym.defining_file_id)) {
      const fileObj = idToFileMap.get(sym.defining_file_id);
      if (!fileObj) return;

      const isComp =
        sym.symbol_kind === "component" ||
        (fileObj.path.match(/\.(tsx|jsx)$/) && /^[A-Z]/.test(sym.symbol_name));

      if (isComp && !compDedupeSet.has(sym.symbol_name)) {
        compDedupeSet.add(sym.symbol_name);
        affectedComponents.push({
          name: sym.symbol_name,
          path: fileObj.path,
        });
      }
    }
  });

  affectedComponents.sort((a, b) => a.path.localeCompare(b.path));

  // 11. Conservatively Detect Next.js App Router Routes Connected to Impact
  const affectedRoutes: AffectedRouteItem[] = [];
  const routeDedupeSet = new Set<string>();

  allAffectedFileIds.forEach((fileId) => {
    const fileObj = idToFileMap.get(fileId);
    if (!fileObj) return;

    const normPath = fileObj.path.replace(/\\/g, "/");

    // Match App Router Pages and Layouts
    if (normPath.includes("app/") || normPath.startsWith("app/")) {
      if (normPath.endsWith("page.tsx") || normPath.endsWith("page.jsx") || normPath.endsWith("page.ts") || normPath.endsWith("page.js")) {
        // Format route path e.g. "src/app/repositories/[id]/page.tsx" -> "/repositories/[id]"
        let routePath = normPath
          .substring(normPath.indexOf("app/") + 4)
          .replace(/\/page\.(tsx|jsx|ts|js)$/, "");

        if (!routePath || routePath === "page") {
          routePath = "/";
        } else {
          routePath = `/${routePath}`;
        }

        if (!routeDedupeSet.has(routePath)) {
          routeDedupeSet.add(routePath);
          affectedRoutes.push({
            route_path: routePath,
            file_path: fileObj.path,
          });
        }
      }
    }
  });

  affectedRoutes.sort((a, b) => a.route_path.localeCompare(b.route_path));

  // 12. Check if Target File Participates in Dependency Cycles
  let inCircularCycle = false;
  if (scoreData?.analysis_payload?.scoringBreakdown) {
    // Check if target file path is in any circular cycle list
    const layerViolations = (scoreData.analysis_payload.layerViolations || []) as Array<{ sourcePath: string; targetPath: string }>;
    inCircularCycle = layerViolations.some(
      (v) => v.sourcePath === targetFile.path || v.targetPath === targetFile.path
    );
  }

  // 13. Calculate Deterministic Risk Scoring & Explanations
  const directCount = directDependents.length;
  const transitiveCount = transitiveDependents.length;
  const totalAffectedCount = directCount + transitiveCount;
  const fanIn = directCount;
  const fanOut = forwardAdj.get(targetFile.id)?.size || 0;

  let maxDepth = 0;
  visitedDepthMap.forEach((depth) => {
    if (depth > maxDepth) maxDepth = depth;
  });

  let risk: ImpactRisk = "low";
  const reasons: string[] = [];

  // Deterministic Classification Criteria
  if (
    totalAffectedCount >= 15 ||
    (directCount >= 8 && inCircularCycle) ||
    (directCount >= 10 && fanOut >= 5)
  ) {
    risk = "critical";
  } else if (totalAffectedCount >= 8 || directCount >= 5 || inCircularCycle) {
    risk = "high";
  } else if (totalAffectedCount >= 3 || directCount >= 2) {
    risk = "medium";
  } else {
    risk = "low";
  }

  // Generate Explicit Explainable Reasons
  if (directCount > 0) {
    reasons.push(`Fan-in signal: ${directCount} file(s) directly import this target.`);
  } else {
    reasons.push("Isolated module: No internal files directly import this file.");
  }

  if (transitiveCount > 0) {
    reasons.push(`System ripple effect: ${transitiveCount} additional downstream file(s) are transitively affected.`);
  }

  if (maxDepth > 1) {
    reasons.push(`Dependency depth reaches ${maxDepth} layer(s) deep across codebase.`);
  }

  if (inCircularCycle) {
    reasons.push("Target file participates in an architectural circular dependency loop.");
  }

  if (affectedSymbols.length > 0) {
    reasons.push(`${affectedSymbols.length} symbol definition(s) from this file are referenced across impact path.`);
  }

  if (affectedRoutes.length > 0) {
    reasons.push(`${affectedRoutes.length} Next.js route(s) (${affectedRoutes.map((r) => r.route_path).slice(0, 3).join(", ")}) depend on this module.`);
  }

  const result: ChangeImpactResult = {
    targetFile: {
      id: targetFile.id,
      path: targetFile.path,
      name: targetFile.name,
    },
    risk,
    reasons,
    directDependents,
    transitiveDependents,
    affectedSymbols,
    affectedComponents,
    affectedRoutes,
    inCircularCycle,
    stats: {
      directCount,
      transitiveCount,
      totalAffectedCount,
      maxDepth,
      fanIn,
      fanOut,
    },
  };

  return {
    success: true,
    result,
    error: null,
  };
}
