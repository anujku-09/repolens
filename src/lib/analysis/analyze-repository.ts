import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { analyzeRepositoryFile } from "@/lib/analysis/analyze-file";
import { RepositoryAnalysisSummary, RepositoryFileAnalysis } from "@/types";

const CONCURRENCY_LIMIT = 5;

export interface GetRepositoryAnalysisResult {
  analysisMap: Map<string, RepositoryFileAnalysis>;
  summary: RepositoryAnalysisSummary | null;
  error?: string | null;
}

/**
 * Fetch all existing AST analysis records for a repository.
 */
export async function getRepositoryAnalysisMap(
  repositoryId: string
): Promise<GetRepositoryAnalysisResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { analysisMap: new Map(), summary: null };
  }

  const { data, error } = await supabase
    .from("repository_file_analysis")
    .select("*")
    .eq("repository_id", repositoryId);

  if (error) {
    console.error("[getRepositoryAnalysisMap Error]:", error);
    return { analysisMap: new Map(), summary: null, error: error.message };
  }

  if (!data) {
    return { analysisMap: new Map(), summary: null };
  }

  const analysisMap = new Map<string, RepositoryFileAnalysis>();
  let totalSourceFiles = data.length;
  let analyzedFiles = 0;
  let unsupportedFiles = 0;
  let failedFiles = 0;
  let imports = 0;
  let exports = 0;
  let functions = 0;
  let classes = 0;
  let variables = 0;
  let components = 0;
  const unsupportedSet = new Set<string>();

  data.forEach((row) => {
    const analysis = row as RepositoryFileAnalysis;
    analysisMap.set(analysis.repository_file_id, analysis);

    if (analysis.status === "analyzed") {
      analyzedFiles++;
      imports += analysis.imports_count || 0;
      exports += analysis.exports_count || 0;
      functions += analysis.functions_count || 0;
      classes += analysis.classes_count || 0;
      variables += analysis.variables_count || 0;
      components += analysis.components_count || 0;
    } else if (analysis.status === "unsupported") {
      unsupportedFiles++;
      if (analysis.language) {
        unsupportedSet.add(analysis.language);
      }
    } else if (analysis.status === "failed") {
      failedFiles++;
    }
  });

  const summary: RepositoryAnalysisSummary = {
    totalSourceFiles,
    analyzedFiles,
    unsupportedFiles,
    failedFiles,
    imports,
    exports,
    functions,
    classes,
    variables,
    components,
    unsupportedLanguages: Array.from(unsupportedSet),
  };

  return {
    analysisMap,
    summary,
  };
}

/**
 * Executes repository-level AST source code structural analysis.
 * Processes files with bounded concurrency limit of 5.
 * Persists each file's analysis independently into public.repository_file_analysis.
 */
export async function analyzeRepository(
  repositoryId: string
): Promise<{ success: boolean; summary?: RepositoryAnalysisSummary; error: string | null }> {
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

  // Fetch all stored repository file contents candidate records
  const { data: contentsData, error: contentsError } = await supabase
    .from("repository_file_contents")
    .select("repository_file_id")
    .eq("repository_id", repositoryId);

  if (contentsError || !contentsData || contentsData.length === 0) {
    return {
      success: false,
      error: "No source code contents ingested yet. Please click 'Ingest Source Code' first.",
    };
  }

  const candidateFileIds = contentsData.map((row) => row.repository_file_id);
  const fileErrors: string[] = [];

  // Process candidate files in batches with a bounded concurrency limit of 5
  for (let i = 0; i < candidateFileIds.length; i += CONCURRENCY_LIMIT) {
    const chunk = candidateFileIds.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(chunk.map((fileId) => analyzeRepositoryFile(fileId)));

    results.forEach((r) => {
      if (!r.success && r.error) {
        fileErrors.push(r.error);
      }
    });
  }

  // Fetch updated aggregated analysis metrics
  const { summary, error: summaryError } = await getRepositoryAnalysisMap(repositoryId);

  if (summaryError || !summary) {
    const dbError = summaryError || (fileErrors.length > 0 ? fileErrors[0] : "Database error");
    return {
      success: false,
      error: `Failed to retrieve analysis records: ${dbError}. Make sure the SQL migration for 'public.repository_file_analysis' has been run in Supabase.`,
    };
  }

  return {
    success: true,
    summary,
    error: null,
  };
}
