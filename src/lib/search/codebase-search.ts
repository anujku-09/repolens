import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import {
  CodebaseSearchResult,
  CodebaseSearchFilters,
  SearchMatchFile,
  SearchMatchSymbol,
  RepositoryFile,
  RepositorySymbol,
  RepositorySymbolReference,
} from "@/types";

/**
 * Feature 10: Server-Side AST-Aware Codebase & Symbol Search Engine.
 * Enables instant searching across indexed file trees, symbol definitions, and import relationships.
 */
export async function searchCodebase(
  repositoryId: string,
  query: string,
  filters: CodebaseSearchFilters = {}
): Promise<{ success: boolean; result?: CodebaseSearchResult; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { success: false, error: "Unauthorized: Please log in first." };
  }

  // Verify ownership
  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    return { success: false, error: "Repository not found." };
  }

  const q = query.trim().toLowerCase();

  // 1. Bulk load repository files
  const files = await getRepositoryFiles(repositoryId);
  const idToFileMap = new Map<string, RepositoryFile>();
  files.forEach((f) => idToFileMap.set(f.id, f));

  // 2. Bulk load repository dependencies to calculate Fan-In per file
  const { data: depsData } = await supabase
    .from("repository_dependencies")
    .select("target_file_id")
    .eq("repository_id", repositoryId);

  const fileFanInMap = new Map<string, number>();
  (depsData || []).forEach((d) => {
    if (d.target_file_id) {
      fileFanInMap.set(d.target_file_id, (fileFanInMap.get(d.target_file_id) || 0) + 1);
    }
  });

  // 3. Bulk load file analysis for AST summary counts
  const { data: analysisData } = await supabase
    .from("repository_file_analysis")
    .select("file_id, functions_count, components_count, exports_count")
    .eq("repository_id", repositoryId);

  const fileAnalysisMap = new Map<string, { fCount: number; cCount: number; eCount: number }>();
  (analysisData || []).forEach((a) => {
    fileAnalysisMap.set(a.file_id, {
      fCount: a.functions_count || 0,
      cCount: a.components_count || 0,
      eCount: a.exports_count || 0,
    });
  });

  // 4. Bulk load repository symbols
  const { data: symbolsData } = await supabase
    .from("repository_symbols")
    .select("*")
    .eq("repository_id", repositoryId);

  const symbols = (symbolsData || []) as RepositorySymbol[];

  // 5. Bulk load symbol references to compute usage count per symbol
  const { data: refsData } = await supabase
    .from("repository_symbol_references")
    .select("symbol_id")
    .eq("repository_id", repositoryId);

  const symbolRefCountMap = new Map<string, number>();
  (refsData || []).forEach((r) => {
    symbolRefCountMap.set(r.symbol_id, (symbolRefCountMap.get(r.symbol_id) || 0) + 1);
  });

  // --- FILTER MATCHING FILES ---
  const matchingFiles: SearchMatchFile[] = [];
  if (q.length > 0) {
    files.forEach((f) => {
      if (f.type === "file") {
        const pathLower = f.path.toLowerCase();
        const nameLower = f.name.toLowerCase();

        if (pathLower.includes(q) || nameLower.includes(q)) {
          const astMeta = fileAnalysisMap.get(f.id);
          matchingFiles.push({
            id: f.id,
            path: f.path,
            name: f.name,
            language: f.language,
            size: f.size,
            functionsCount: astMeta?.fCount || 0,
            componentsCount: astMeta?.cCount || 0,
            exportedSymbolsCount: astMeta?.eCount || 0,
            fanIn: fileFanInMap.get(f.id) || 0,
          });
        }
      }
    });
  }

  // --- FILTER MATCHING SYMBOLS ---
  const matchingSymbols: SearchMatchSymbol[] = [];
  symbols.forEach((sym) => {
    const symNameLower = sym.symbol_name.toLowerCase();
    const definingFile = idToFileMap.get(sym.defining_file_id);
    const definingPath = definingFile?.path || "";
    const pathLower = definingPath.toLowerCase();

    // Check query match (matches if query is empty OR symbol/path matches)
    const matchesQuery = q.length === 0 || symNameLower.includes(q) || pathLower.includes(q);

    if (!matchesQuery) return;

    // Filter by symbol kind if specified
    if (filters.symbolKind && filters.symbolKind !== "all") {
      if (sym.symbol_kind !== filters.symbolKind) return;
    }

    // Filter by exported status if specified
    if (filters.exportedOnly && !sym.is_exported) {
      return;
    }

    const refCount = symbolRefCountMap.get(sym.id) || 0;

    // Filter by minimum usages if specified
    if (typeof filters.minUsages === "number" && refCount < filters.minUsages) {
      return;
    }

    matchingSymbols.push({
      id: sym.id,
      symbol_name: sym.symbol_name,
      symbol_kind: sym.symbol_kind,
      defining_path: definingPath,
      is_exported: sym.is_exported,
      reference_count: refCount,
      start_line: sym.start_line ?? null,
    });
  });

  // Sort matching symbols by usage reference count descending
  matchingSymbols.sort(
    (a, b) => b.reference_count - a.reference_count || a.symbol_name.localeCompare(b.symbol_name)
  );

  const totalMatches = matchingFiles.length + matchingSymbols.length;

  const result: CodebaseSearchResult = {
    query,
    totalMatches,
    matchingFiles: matchingFiles.slice(0, 30),
    matchingSymbols: matchingSymbols.slice(0, 50),
  };

  return {
    success: true,
    result,
    error: null,
  };
}
