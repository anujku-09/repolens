import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { analyzeFileImpact } from "@/lib/analysis/impact/analyze-impact";
import {
  AICodebasePromptContext,
  RepositoryFile,
  RepositorySymbol,
  RepositorySymbolReference,
  SymbolKind,
} from "@/types";

/**
 * Feature 11: AI Codebase Intelligence Engine.
 * Constructs deterministic, noise-free AST & graph context payloads for LLMs and AI Assistants.
 */
export async function generateAICodebasePromptContext(
  repositoryId: string,
  fileId?: string,
  query?: string
): Promise<{ success: boolean; context?: AICodebasePromptContext; error: string | null }> {
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
  files.forEach((f) => idToFileMap.set(f.id, f));

  // 3. Bulk load symbols
  const { data: symbolsData } = await supabase
    .from("repository_symbols")
    .select("*")
    .eq("repository_id", repositoryId);

  const symbols = (symbolsData || []) as RepositorySymbol[];
  const symbolIdMap = new Map<string, RepositorySymbol>();
  symbols.forEach((s) => symbolIdMap.set(s.id, s));

  // 4. Bulk load symbol references
  const { data: refsData } = await supabase
    .from("repository_symbol_references")
    .select("symbol_id")
    .eq("repository_id", repositoryId);

  const symbolRefCountMap = new Map<string, number>();
  (refsData || []).forEach((r) => {
    symbolRefCountMap.set(r.symbol_id, (symbolRefCountMap.get(r.symbol_id) || 0) + 1);
  });

  // 5. Bulk load dependency edges
  const { data: depsData } = await supabase
    .from("repository_dependencies")
    .select("source_file_id, target_file_id, dependency_type")
    .eq("repository_id", repositoryId);

  // 6. Bulk load architecture score
  const { data: scoreData } = await supabase
    .from("repository_architecture_scores")
    .select("health_score")
    .eq("repository_id", repositoryId)
    .maybeSingle();

  // Evaluate Target File & Change Impact if fileId provided
  let targetFile = fileId ? idToFileMap.get(fileId) : undefined;
  let impactInfo: AICodebasePromptContext["impactTree"] | undefined = undefined;

  if (targetFile && targetFile.type === "file") {
    const impactRes = await analyzeFileImpact(repositoryId, targetFile.id);
    if (impactRes.success && impactRes.result) {
      impactInfo = {
        risk: impactRes.result.risk,
        directCount: impactRes.result.stats.directCount,
        transitiveCount: impactRes.result.stats.transitiveCount,
        affectedRoutes: impactRes.result.affectedRoutes.map((r) => r.route_path),
      };
    }
  }

  // Filter top relevant symbols (up to 20)
  const filteredSymbols = symbols
    .map((s) => ({
      name: s.symbol_name,
      kind: s.symbol_kind,
      definingPath: idToFileMap.get(s.defining_file_id)?.path || "",
      isExported: s.is_exported,
      referenceCount: symbolRefCountMap.get(s.id) || 0,
    }))
    .sort((a, b) => b.referenceCount - a.referenceCount || a.name.localeCompare(b.name))
    .slice(0, 20);

  // Format relevant dependency edges (up to 15)
  const formattedDeps = (depsData || [])
    .slice(0, 15)
    .map((d) => ({
      source: idToFileMap.get(d.source_file_id)?.path || d.source_file_id,
      target: idToFileMap.get(d.target_file_id)?.path || d.target_file_id,
      type: d.dependency_type,
    }));

  // Build Structured Markdown Prompt Payload for AI Assistants
  const markdownLines: string[] = [];

  markdownLines.push(`# 🤖 RepoLens AI Context Payload: ${repository.full_name}`);
  markdownLines.push(`*Generated AST + Graph Verification Context for LLMs & AI Coding Assistants*\n`);

  markdownLines.push(`## 📊 Codebase Overview`);
  markdownLines.push(`- **Repository**: \`${repository.full_name}\``);
  markdownLines.push(`- **Total Indexed Files**: ${files.length}`);
  markdownLines.push(`- **Total Mapped Symbols**: ${symbols.length}`);
  markdownLines.push(`- **Architecture Health Score**: ${scoreData?.health_score ?? "N/A"}/100\n`);

  if (targetFile) {
    markdownLines.push(`## 🎯 Target Module Context`);
    markdownLines.push(`- **Target Path**: \`${targetFile.path}\``);
    if (impactInfo) {
      markdownLines.push(`- **Change Impact Risk**: \`${impactInfo.risk.toUpperCase()}\``);
      markdownLines.push(`- **Direct Dependents (L1)**: ${impactInfo.directCount} file(s)`);
      markdownLines.push(`- **Transitive Downstream Ripple**: ${impactInfo.transitiveCount} file(s)`);
      if (impactInfo.affectedRoutes.length > 0) {
        markdownLines.push(`- **Connected Routes**: ${impactInfo.affectedRoutes.join(", ")}`);
      }
    }
    markdownLines.push(``);
  }

  markdownLines.push(`## 🧩 AST Symbol Definitions & Usages`);
  markdownLines.push(`| Symbol | Kind | Defined In | Exported | Usages |`);
  markdownLines.push(`| :--- | :--- | :--- | :--- | :--- |`);
  filteredSymbols.forEach((s) => {
    markdownLines.push(`| \`${s.name}\` | \`${s.kind}\` | \`${s.definingPath}\` | ${s.isExported ? "YES" : "NO"} | **${s.referenceCount} refs** |`);
  });
  markdownLines.push(``);

  markdownLines.push(`## 🔗 Verified Graph Dependency Edges`);
  formattedDeps.forEach((d) => {
    markdownLines.push(`- \`${d.source}\` &rarr; \`${d.target}\` (${d.type})`);
  });
  markdownLines.push(``);

  markdownLines.push(`## 💡 AI Refactoring & Code Modification Rules`);
  markdownLines.push(`1. Preserve exact function signatures and exported types for symbols with high usage counts.`);
  markdownLines.push(`2. Inspect Level 1 direct dependent files before altering exported module props.`);
  markdownLines.push(`3. Ensure newly introduced dependencies follow modular layer hierarchy.`);

  const formattedMarkdownPrompt = markdownLines.join("\n");
  const estimatedTokensCount = Math.ceil(formattedMarkdownPrompt.length / 4);

  const contextPayload: AICodebasePromptContext = {
    repositoryName: repository.full_name,
    targetFilePath: targetFile?.path,
    query,
    summary: {
      totalFiles: files.length,
      totalSymbols: symbols.length,
      healthScore: scoreData?.health_score ?? null,
    },
    symbolDefinitions: filteredSymbols,
    dependencyEdges: formattedDeps,
    impactTree: impactInfo,
    formattedMarkdownPrompt,
    estimatedTokensCount,
  };

  return {
    success: true,
    context: contextPayload,
    error: null,
  };
}
