import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { getRepositoryAnalysisMap } from "@/lib/analysis/analyze-repository";
import { resolveImportPath, normalizePath } from "@/lib/analysis/dependency/resolver";
import { detectCircularDependencies } from "@/lib/analysis/dependency/cycle-detector";
import {
  RepositoryDependencyInsert,
  DependencyGraphSummary,
  SerializedGraphData,
  GraphNode,
  GraphEdge,
  RepositoryFile,
} from "@/types";

const BATCH_SIZE = 500;

/**
 * Bulk insert internal repository dependencies in 500-row chunks via Supabase RLS.
 */
async function bulkInsertDependencies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  records: RepositoryDependencyInsert[]
): Promise<{ error: string | null }> {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("repository_dependencies").insert(chunk);

    if (error) {
      console.error(`[bulkInsertDependencies Batch Error (Index ${i})]:`, error);
      return { error: error.message };
    }
  }

  return { error: null };
}

/**
 * Builds the complete repository dependency graph:
 * 1. Authenticates user & checks repository ownership
 * 2. Fetches repository files & builds in-memory path index once
 * 3. Fetches AST analysis facts & resolves internal, external, and unresolved imports
 * 4. Replaces stale dependency edges in public.repository_dependencies
 * 5. Runs cycle detection & calculates dependency statistics
 */
export async function buildRepositoryDependencyGraph(
  repositoryId: string
): Promise<{ success: boolean; summary?: DependencyGraphSummary; error: string | null }> {
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

  // 1. Retrieve repository files
  const files = await getRepositoryFiles(repositoryId);
  if (files.length === 0) {
    return {
      success: false,
      error: "No files found for this repository. Ingest the repository file tree first.",
    };
  }

  // Build in-memory normalized path index Map<normalizedPath, RepositoryFile>
  const fileMap = new Map<string, RepositoryFile>();
  const idToFileMap = new Map<string, RepositoryFile>();

  files.forEach((f) => {
    idToFileMap.set(f.id, f);
    if (f.type === "file") {
      fileMap.set(normalizePath(f.path), f);
    }
  });

  // 2. Retrieve existing AST file analysis records
  const { analysisMap } = await getRepositoryAnalysisMap(repositoryId);
  if (analysisMap.size === 0) {
    return {
      success: false,
      error: "No AST analysis data found. Run 'Analyze Code Structure' first.",
    };
  }

  const internalInserts: RepositoryDependencyInsert[] = [];
  const edgePairsForCycleCheck: { sourcePath: string; targetPath: string }[] = [];
  const externalPackageCounts = new Map<string, number>();
  const inDegreeMap = new Map<string, number>();  // file.id -> count
  const outDegreeMap = new Map<string, number>(); // file.id -> count
  let externalDependenciesCount = 0;
  let unresolvedDependenciesCount = 0;
  let filesProcessed = 0;

  // Deduplication set: "sourceId->targetId->importPath"
  const edgeDedupeSet = new Set<string>();

  analysisMap.forEach((fileAnalysis, sourceFileId) => {
    const sourceFile = idToFileMap.get(sourceFileId);
    if (!sourceFile || fileAnalysis.status !== "analyzed") return;

    filesProcessed++;
    const importsList = fileAnalysis.analysis?.imports || [];

    importsList.forEach((imp) => {
      const importPath = imp.source;
      if (!importPath) return;

      const resolution = resolveImportPath(sourceFile.path, importPath, fileMap);

      if (resolution.type === "internal") {
        const targetFile = resolution.targetFile;

        // Prevent duplicate edge insertion
        const edgeKey = `${sourceFile.id}->${targetFile.id}->${importPath}`;
        if (!edgeDedupeSet.has(edgeKey)) {
          edgeDedupeSet.add(edgeKey);

          internalInserts.push({
            repository_id: repositoryId,
            user_id: user.id,
            source_file_id: sourceFile.id,
            target_file_id: targetFile.id,
            import_path: importPath,
            dependency_type: "internal",
          });

          edgePairsForCycleCheck.push({
            sourcePath: sourceFile.path,
            targetPath: targetFile.path,
          });

          outDegreeMap.set(sourceFile.id, (outDegreeMap.get(sourceFile.id) || 0) + 1);
          inDegreeMap.set(targetFile.id, (inDegreeMap.get(targetFile.id) || 0) + 1);
        }
      } else if (resolution.type === "external") {
        externalDependenciesCount++;
        externalPackageCounts.set(
          resolution.packageName,
          (externalPackageCounts.get(resolution.packageName) || 0) + 1
        );
      } else if (resolution.type === "unresolved") {
        unresolvedDependenciesCount++;
      }
    });
  });

  // 3. Clear stale dependency records for this repository
  const { error: deleteError } = await supabase
    .from("repository_dependencies")
    .delete()
    .eq("repository_id", repositoryId);

  if (deleteError) {
    console.error("[buildRepositoryDependencyGraph Delete Error]:", deleteError);
    return {
      success: false,
      error: `Failed to clear stale dependency records: ${deleteError.message}. Make sure 'public.repository_dependencies' table exists in Supabase.`,
    };
  }

  // 4. Bulk insert internal dependency edges
  if (internalInserts.length > 0) {
    const { error: insertError } = await bulkInsertDependencies(supabase, internalInserts);
    if (insertError) {
      return { success: false, error: `Failed to insert dependency records: ${insertError}` };
    }
  }

  // 5. Circular Dependency Detection
  const circularCycles = detectCircularDependencies(edgePairsForCycleCheck);

  // 6. Compute top statistics
  const mostImportedFiles = Array.from(inDegreeMap.entries())
    .map(([fileId, count]) => ({
      path: idToFileMap.get(fileId)?.path || fileId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const mostDependentFiles = Array.from(outDegreeMap.entries())
    .map(([fileId, count]) => ({
      path: idToFileMap.get(fileId)?.path || fileId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const externalPackages = Array.from(externalPackageCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const summary: DependencyGraphSummary = {
    filesProcessed,
    internalDependencies: internalInserts.length,
    externalDependencies: externalDependenciesCount,
    unresolvedDependencies: unresolvedDependenciesCount,
    circularDependencyCount: circularCycles.length,
    mostImportedFiles,
    mostDependentFiles,
    externalPackages,
    circularCycles,
  };

  return {
    success: true,
    summary,
    error: null,
  };
}

/**
 * Fetches and serializes real graph nodes, edges, and statistics for UI visualizers.
 * Computes external packages and unresolved imports dynamically from AST file analysis.
 */
export async function getSerializedDependencyGraph(
  repositoryId: string
): Promise<SerializedGraphData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { nodes: [], edges: [], summary: null };
  }

  const files = await getRepositoryFiles(repositoryId);
  const codeFiles = files.filter((f) => f.type === "file");
  const fileMap = new Map<string, RepositoryFile>(codeFiles.map((f) => [f.id, f]));
  const normalizedFileMap = new Map<string, RepositoryFile>();

  codeFiles.forEach((f) => {
    normalizedFileMap.set(normalizePath(f.path), f);
  });

  // Fetch internal dependencies
  const { data: depsData, error } = await supabase
    .from("repository_dependencies")
    .select("*")
    .eq("repository_id", repositoryId);

  if (error || !depsData) {
    return { nodes: [], edges: [], summary: null };
  }

  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();
  const importsMap = new Map<string, Set<string>>();   // fileId -> set of target file paths
  const importedByMap = new Map<string, Set<string>>();// fileId -> set of source file paths

  const edges: GraphEdge[] = [];

  depsData.forEach((dep) => {
    const srcId = dep.source_file_id;
    const tgtId = dep.target_file_id;

    outDegreeMap.set(srcId, (outDegreeMap.get(srcId) || 0) + 1);
    inDegreeMap.set(tgtId, (inDegreeMap.get(tgtId) || 0) + 1);

    const srcFile = fileMap.get(srcId);
    const tgtFile = fileMap.get(tgtId);

    if (srcFile && tgtFile) {
      if (!importsMap.has(srcId)) importsMap.set(srcId, new Set());
      importsMap.get(srcId)!.add(tgtFile.path);

      if (!importedByMap.has(tgtId)) importedByMap.set(tgtId, new Set());
      importedByMap.get(tgtId)!.add(srcFile.path);

      edges.push({
        id: dep.id,
        source: srcFile.path,
        target: tgtFile.path,
        importPath: dep.import_path,
      });
    }
  });

  // Calculate external packages & unresolved imports dynamically from AST analysis
  const { analysisMap } = await getRepositoryAnalysisMap(repositoryId);
  const externalPackageCounts = new Map<string, number>();
  let externalDependenciesCount = 0;
  let unresolvedDependenciesCount = 0;

  analysisMap.forEach((fileAnalysis, sourceFileId) => {
    const sourceFile = fileMap.get(sourceFileId);
    if (!sourceFile || fileAnalysis.status !== "analyzed") return;

    const importsList = fileAnalysis.analysis?.imports || [];
    importsList.forEach((imp) => {
      if (!imp.source) return;
      const res = resolveImportPath(sourceFile.path, imp.source, normalizedFileMap);
      if (res.type === "external") {
        externalDependenciesCount++;
        externalPackageCounts.set(
          res.packageName,
          (externalPackageCounts.get(res.packageName) || 0) + 1
        );
      } else if (res.type === "unresolved") {
        unresolvedDependenciesCount++;
      }
    });
  });

  // Include all code files in nodes list (do not strip zero-edge files)
  const nodes: GraphNode[] = codeFiles.map((f) => ({
    id: f.id,
    path: f.path,
    name: f.name,
    language: f.language,
    size: f.size,
    inDegree: inDegreeMap.get(f.id) || 0,
    outDegree: outDegreeMap.get(f.id) || 0,
    imports: Array.from(importsMap.get(f.id) || []),
    importedBy: Array.from(importedByMap.get(f.id) || []),
  }));

  const circularCycles = detectCircularDependencies(
    edges.map((e) => ({ sourcePath: e.source, targetPath: e.target }))
  );

  const mostImportedFiles = Array.from(inDegreeMap.entries())
    .map(([fileId, count]) => ({
      path: fileMap.get(fileId)?.path || fileId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const mostDependentFiles = Array.from(outDegreeMap.entries())
    .map(([fileId, count]) => ({
      path: fileMap.get(fileId)?.path || fileId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const externalPackages = Array.from(externalPackageCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const summary: DependencyGraphSummary = {
    filesProcessed: codeFiles.length,
    internalDependencies: edges.length,
    externalDependencies: externalDependenciesCount,
    unresolvedDependencies: unresolvedDependenciesCount,
    circularDependencyCount: circularCycles.length,
    mostImportedFiles,
    mostDependentFiles,
    externalPackages,
    circularCycles,
  };

  return {
    nodes,
    edges,
    summary,
  };
}
