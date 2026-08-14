import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { getRepositoryAnalysisMap } from "@/lib/analysis/analyze-repository";
import { resolveImportPath, normalizePath } from "@/lib/analysis/dependency/resolver";
import {
  RepositoryFile,
  RepositorySymbolInsert,
  RepositorySymbolReferenceInsert,
  RepositorySymbol,
  SymbolGraphSummary,
  SymbolKind,
} from "@/types";

const BATCH_SIZE = 500;

/**
 * Builds symbol definitions and cross-file usage reference edges for a repository.
 */
export async function buildRepositorySymbols(
  repositoryId: string
): Promise<{ success: boolean; summary?: SymbolGraphSummary; error: string | null }> {
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
      error: "No files found for this repository. Ingest the file tree first.",
    };
  }

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

  const symbolInserts: RepositorySymbolInsert[] = [];
  const symbolDedupeSet = new Set<string>();

  // 3. Extract Symbol Definitions per file
  analysisMap.forEach((fileAnalysis, fileId) => {
    const file = idToFileMap.get(fileId);
    if (!file || fileAnalysis.status !== "analyzed") return;

    const analysis = fileAnalysis.analysis;
    if (!analysis) return;

    const exportedNames = new Set(analysis.exports?.map((e) => e.name) || []);
    const defaultExportObj = analysis.exports?.find((e) => e.default);

    // Functions
    (analysis.functions || []).forEach((fn) => {
      if (!fn.name) return;
      const dedupeKey = `${fileId}:${fn.name}`;
      if (!symbolDedupeSet.has(dedupeKey)) {
        symbolDedupeSet.add(dedupeKey);
        const isExp = fn.exported || exportedNames.has(fn.name);
        symbolInserts.push({
          repository_id: repositoryId,
          user_id: user.id,
          defining_file_id: fileId,
          symbol_name: fn.name,
          symbol_kind: "function",
          is_exported: isExp,
          is_default_export: defaultExportObj?.name === fn.name,
          start_line: fn.startLine,
          end_line: fn.endLine,
        });
      }
    });

    // Classes
    (analysis.classes || []).forEach((cls) => {
      if (!cls.name) return;
      const dedupeKey = `${fileId}:${cls.name}`;
      if (!symbolDedupeSet.has(dedupeKey)) {
        symbolDedupeSet.add(dedupeKey);
        const isExp = cls.exported || exportedNames.has(cls.name);
        symbolInserts.push({
          repository_id: repositoryId,
          user_id: user.id,
          defining_file_id: fileId,
          symbol_name: cls.name,
          symbol_kind: "class",
          is_exported: isExp,
          is_default_export: defaultExportObj?.name === cls.name,
          start_line: cls.startLine,
          end_line: cls.endLine,
        });
      }
    });

    // React Components
    (analysis.components || []).forEach((comp) => {
      if (!comp.name) return;
      const dedupeKey = `${fileId}:${comp.name}`;
      if (!symbolDedupeSet.has(dedupeKey)) {
        symbolDedupeSet.add(dedupeKey);
        const isExp = exportedNames.has(comp.name);
        symbolInserts.push({
          repository_id: repositoryId,
          user_id: user.id,
          defining_file_id: fileId,
          symbol_name: comp.name,
          symbol_kind: "component",
          is_exported: isExp,
          is_default_export: defaultExportObj?.name === comp.name,
          start_line: comp.startLine,
          end_line: comp.endLine,
        });
      }
    });

    // Variables
    (analysis.variables || []).forEach((v) => {
      if (!v.name) return;
      const dedupeKey = `${fileId}:${v.name}`;
      if (!symbolDedupeSet.has(dedupeKey)) {
        symbolDedupeSet.add(dedupeKey);
        const isExp = v.exported || exportedNames.has(v.name);
        symbolInserts.push({
          repository_id: repositoryId,
          user_id: user.id,
          defining_file_id: fileId,
          symbol_name: v.name,
          symbol_kind: "variable",
          is_exported: isExp,
          is_default_export: defaultExportObj?.name === v.name,
        });
      }
    });

    // Additional Exported Symbols
    (analysis.exports || []).forEach((exp) => {
      if (!exp.name || exp.name === "default") return;
      const dedupeKey = `${fileId}:${exp.name}`;
      if (!symbolDedupeSet.has(dedupeKey)) {
        symbolDedupeSet.add(dedupeKey);
        symbolInserts.push({
          repository_id: repositoryId,
          user_id: user.id,
          defining_file_id: fileId,
          symbol_name: exp.name,
          symbol_kind: "export",
          is_exported: true,
          is_default_export: exp.default,
        });
      }
    });
  });

  // 4. Clear stale symbol definition records
  const { error: deleteSymError } = await supabase
    .from("repository_symbols")
    .delete()
    .eq("repository_id", repositoryId);

  if (deleteSymError) {
    console.error("[buildRepositorySymbols Delete Error]:", deleteSymError);
    return {
      success: false,
      error: `Failed to clear stale symbols: ${deleteSymError.message}. Make sure 'public.repository_symbols' table exists in Supabase.`,
    };
  }

  // 5. Bulk insert new symbol definitions
  if (symbolInserts.length > 0) {
    for (let i = 0; i < symbolInserts.length; i += BATCH_SIZE) {
      const chunk = symbolInserts.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from("repository_symbols").insert(chunk);
      if (insertError) {
        console.error(`[buildRepositorySymbols Insert Error Batch ${i}]:`, insertError);
        return { success: false, error: `Failed to insert symbols: ${insertError.message}` };
      }
    }
  }

  // 6. Fetch newly inserted symbol definitions for ID lookup
  const { data: insertedSymbolsData, error: fetchSymError } = await supabase
    .from("repository_symbols")
    .select("*")
    .eq("repository_id", repositoryId);

  if (fetchSymError || !insertedSymbolsData) {
    return { success: false, error: "Failed to fetch inserted symbol definitions." };
  }

  const insertedSymbols = insertedSymbolsData as RepositorySymbol[];
  // FileId -> Map<SymbolName, RepositorySymbol>
  const fileSymbolMap = new Map<string, Map<string, RepositorySymbol>>();
  const symbolIdMap = new Map<string, RepositorySymbol>();

  insertedSymbols.forEach((sym) => {
    symbolIdMap.set(sym.id, sym);
    if (!fileSymbolMap.has(sym.defining_file_id)) {
      fileSymbolMap.set(sym.defining_file_id, new Map());
    }
    fileSymbolMap.get(sym.defining_file_id)!.set(sym.symbol_name, sym);
  });

  // 7. Resolve Cross-File Symbol References
  const referenceInserts: RepositorySymbolReferenceInsert[] = [];
  const refDedupeSet = new Set<string>();
  const symbolUsageCounts = new Map<string, number>(); // symbol.id -> usages

  analysisMap.forEach((fileAnalysis, referencingFileId) => {
    const referencingFile = idToFileMap.get(referencingFileId);
    if (!referencingFile || fileAnalysis.status !== "analyzed") return;

    const importsList = fileAnalysis.analysis?.imports || [];

    importsList.forEach((imp) => {
      if (!imp.source) return;
      const res = resolveImportPath(referencingFile.path, imp.source, fileMap);

      if (res.type === "internal") {
        const targetFile = res.targetFile;
        const targetSymbolsMap = fileSymbolMap.get(targetFile.id);
        if (!targetSymbolsMap) return;

        // Named imports
        (imp.namedImports || []).forEach((importedSymbolName) => {
          const matchedSymbol = targetSymbolsMap.get(importedSymbolName);
          if (matchedSymbol) {
            const refKey = `${matchedSymbol.id}:${referencingFileId}:${importedSymbolName}`;
            if (!refDedupeSet.has(refKey)) {
              refDedupeSet.add(refKey);

              referenceInserts.push({
                repository_id: repositoryId,
                user_id: user.id,
                symbol_id: matchedSymbol.id,
                referencing_file_id: referencingFileId,
                reference_type: "import",
                import_alias: importedSymbolName,
              });

              symbolUsageCounts.set(
                matchedSymbol.id,
                (symbolUsageCounts.get(matchedSymbol.id) || 0) + 1
              );
            }
          }
        });

        // Default import
        if (imp.defaultImport) {
          // Find default export symbol in target file
          const defaultSym = Array.from(targetSymbolsMap.values()).find((s) => s.is_default_export);
          if (defaultSym) {
            const refKey = `${defaultSym.id}:${referencingFileId}:${imp.defaultImport}`;
            if (!refDedupeSet.has(refKey)) {
              refDedupeSet.add(refKey);

              referenceInserts.push({
                repository_id: repositoryId,
                user_id: user.id,
                symbol_id: defaultSym.id,
                referencing_file_id: referencingFileId,
                reference_type: "import",
                import_alias: imp.defaultImport,
              });

              symbolUsageCounts.set(
                defaultSym.id,
                (symbolUsageCounts.get(defaultSym.id) || 0) + 1
              );
            }
          }
        }
      }
    });
  });

  // 8. Clear stale symbol reference records
  const { error: deleteRefError } = await supabase
    .from("repository_symbol_references")
    .delete()
    .eq("repository_id", repositoryId);

  if (deleteRefError) {
    console.error("[buildRepositorySymbols Reference Delete Error]:", deleteRefError);
  }

  // 9. Bulk insert symbol references
  if (referenceInserts.length > 0) {
    for (let i = 0; i < referenceInserts.length; i += BATCH_SIZE) {
      const chunk = referenceInserts.slice(i, i + BATCH_SIZE);
      const { error: insertRefErr } = await supabase
        .from("repository_symbol_references")
        .insert(chunk);

      if (insertRefErr) {
        console.error(`[buildRepositorySymbols Reference Insert Error ${i}]:`, insertRefErr);
      }
    }
  }

  // Helper to identify framework entry points & config files that should not be flagged as unused exports
  const isFrameworkEntryPoint = (filePath: string): boolean => {
    const norm = filePath.replace(/\\/g, "/").toLowerCase();
    if (
      norm.endsWith("next.config.ts") ||
      norm.endsWith("next.config.js") ||
      norm.endsWith("next.config.mjs") ||
      norm.endsWith("eslint.config.mjs") ||
      norm.endsWith("eslint.config.js") ||
      norm.endsWith("postcss.config.mjs") ||
      norm.endsWith("postcss.config.js") ||
      norm.endsWith("tailwind.config.js") ||
      norm.endsWith("tailwind.config.ts") ||
      norm.endsWith("package.json") ||
      norm.endsWith("setup.py") ||
      norm.endsWith("manage.py") ||
      norm.endsWith("wsgi.py") ||
      norm.endsWith("asgi.py") ||
      norm.endsWith("main.py") ||
      norm.endsWith("app.py")
    ) {
      return true;
    }
    if (
      norm.includes("/app/") ||
      norm.startsWith("app/") ||
      norm.includes("middleware")
    ) {
      if (
        norm.endsWith("/page.tsx") ||
        norm.endsWith("/page.jsx") ||
        norm.endsWith("/page.ts") ||
        norm.endsWith("/page.js") ||
        norm.endsWith("/layout.tsx") ||
        norm.endsWith("/layout.jsx") ||
        norm.endsWith("/route.ts") ||
        norm.endsWith("/route.js") ||
        norm.endsWith("/loading.tsx") ||
        norm.endsWith("/error.tsx") ||
        norm.endsWith("/not-found.tsx") ||
        norm.endsWith("/actions.ts") ||
        norm.endsWith("middleware.ts") ||
        norm.endsWith("middleware.js")
      ) {
        return true;
      }
    }
    return false;
  };

  // 10. Compute Summary Statistics & Unused Export Detection
  const exportedSymbols = insertedSymbols.filter((s) => s.is_exported);
  const unusedExports: { symbol_name: string; defining_path: string; kind: SymbolKind }[] = [];

  exportedSymbols.forEach((sym) => {
    const definingFile = idToFileMap.get(sym.defining_file_id);
    const filePath = definingFile?.path || "";

    if (filePath && isFrameworkEntryPoint(filePath)) {
      return;
    }

    const usages = symbolUsageCounts.get(sym.id) || 0;
    if (usages === 0) {
      unusedExports.push({
        symbol_name: sym.symbol_name,
        defining_path: filePath || sym.defining_file_id,
        kind: sym.symbol_kind,
      });
    }
  });

  const allDefinedSymbols = insertedSymbols.map((s) => ({
    symbol_name: s.symbol_name,
    defining_path: idToFileMap.get(s.defining_file_id)?.path || "",
    kind: s.symbol_kind,
    is_exported: s.is_exported,
  }));

  const allExportedSymbols = exportedSymbols.map((s) => ({
    symbol_name: s.symbol_name,
    defining_path: idToFileMap.get(s.defining_file_id)?.path || "",
    kind: s.symbol_kind,
  }));

  const allReferenceEdges = referenceInserts.map((r) => {
    const sym = symbolIdMap.get(r.symbol_id);
    const defFile = sym ? idToFileMap.get(sym.defining_file_id) : undefined;
    const refFile = idToFileMap.get(r.referencing_file_id);
    return {
      symbol_name: sym?.symbol_name || "",
      defining_path: defFile?.path || "",
      referencing_path: refFile?.path || "",
    };
  });

  const topUsedSymbols = Array.from(symbolUsageCounts.entries())
    .map(([symId, count]) => {
      const sym = symbolIdMap.get(symId);
      const file = sym ? idToFileMap.get(sym.defining_file_id) : undefined;
      return {
        symbol_name: sym?.symbol_name || symId,
        defining_path: file?.path || "",
        usages_count: count,
      };
    })
    .sort((a, b) => b.usages_count - a.usages_count)
    .slice(0, 5);

  const summary: SymbolGraphSummary = {
    totalDefinedSymbols: insertedSymbols.length,
    exportedSymbolsCount: exportedSymbols.length,
    symbolReferencesCount: referenceInserts.length,
    unusedExportsCount: unusedExports.length,
    topUsedSymbols,
    unusedExports,
    allDefinedSymbols,
    allExportedSymbols,
    allReferenceEdges,
  };

  return {
    success: true,
    summary,
    error: null,
  };
}

/**
 * Fetches existing symbol resolution metrics for a repository.
 */
export async function getRepositorySymbolSummary(
  repositoryId: string
): Promise<{ summary: SymbolGraphSummary | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { summary: null, error: "Unauthorized" };
  }

  const files = await getRepositoryFiles(repositoryId);
  const idToFileMap = new Map<string, RepositoryFile>(files.map((f) => [f.id, f]));

  const { data: symbolsData, error: symErr } = await supabase
    .from("repository_symbols")
    .select("*")
    .eq("repository_id", repositoryId);

  if (symErr || !symbolsData) {
    return { summary: null, error: symErr?.message || null };
  }

  const symbols = symbolsData as RepositorySymbol[];
  if (symbols.length === 0) {
    return { summary: null, error: null };
  }

  const { data: refsData, error: refErr } = await supabase
    .from("repository_symbol_references")
    .select("*")
    .eq("repository_id", repositoryId);

  const references = (refsData || []) as any[];

  const usageCounts = new Map<string, number>();
  references.forEach((r) => {
    usageCounts.set(r.symbol_id, (usageCounts.get(r.symbol_id) || 0) + 1);
  });

  const isFrameworkEntryPoint = (filePath: string): boolean => {
    const norm = filePath.replace(/\\/g, "/").toLowerCase();
    if (
      norm.endsWith("next.config.ts") ||
      norm.endsWith("next.config.js") ||
      norm.endsWith("next.config.mjs") ||
      norm.endsWith("eslint.config.mjs") ||
      norm.endsWith("eslint.config.js") ||
      norm.endsWith("postcss.config.mjs") ||
      norm.endsWith("postcss.config.js") ||
      norm.endsWith("tailwind.config.js") ||
      norm.endsWith("tailwind.config.ts") ||
      norm.endsWith("package.json")
    ) {
      return true;
    }
    if (
      norm.includes("/app/") ||
      norm.startsWith("app/") ||
      norm.includes("middleware")
    ) {
      if (
        norm.endsWith("/page.tsx") ||
        norm.endsWith("/page.jsx") ||
        norm.endsWith("/page.ts") ||
        norm.endsWith("/page.js") ||
        norm.endsWith("/layout.tsx") ||
        norm.endsWith("/layout.jsx") ||
        norm.endsWith("/route.ts") ||
        norm.endsWith("/route.js") ||
        norm.endsWith("/loading.tsx") ||
        norm.endsWith("/error.tsx") ||
        norm.endsWith("/not-found.tsx") ||
        norm.endsWith("/actions.ts") ||
        norm.endsWith("middleware.ts") ||
        norm.endsWith("middleware.js")
      ) {
        return true;
      }
    }
    return false;
  };

  const exportedSymbols = symbols.filter((s) => s.is_exported);
  const unusedExports: { symbol_name: string; defining_path: string; kind: SymbolKind }[] = [];

  exportedSymbols.forEach((sym) => {
    const file = idToFileMap.get(sym.defining_file_id);
    const filePath = file?.path || "";

    if (filePath && isFrameworkEntryPoint(filePath)) {
      return;
    }

    const count = usageCounts.get(sym.id) || 0;
    if (count === 0) {
      unusedExports.push({
        symbol_name: sym.symbol_name,
        defining_path: filePath || sym.defining_file_id,
        kind: sym.symbol_kind,
      });
    }
  });

  const allDefinedSymbols = symbols.map((s) => ({
    symbol_name: s.symbol_name,
    defining_path: idToFileMap.get(s.defining_file_id)?.path || "",
    kind: s.symbol_kind,
    is_exported: s.is_exported,
  }));

  const allExportedSymbols = exportedSymbols.map((s) => ({
    symbol_name: s.symbol_name,
    defining_path: idToFileMap.get(s.defining_file_id)?.path || "",
    kind: s.symbol_kind,
  }));

  const allReferenceEdges = references.map((r) => {
    const sym = symbols.find((s) => s.id === r.symbol_id);
    const defFile = sym ? idToFileMap.get(sym.defining_file_id) : undefined;
    const refFile = idToFileMap.get(r.referencing_file_id);
    return {
      symbol_name: sym?.symbol_name || "",
      defining_path: defFile?.path || "",
      referencing_path: refFile?.path || "",
    };
  });

  const topUsedSymbols = Array.from(usageCounts.entries())
    .map(([symId, count]) => {
      const sym = symbols.find((s) => s.id === symId);
      const file = sym ? idToFileMap.get(sym.defining_file_id) : undefined;
      return {
        symbol_name: sym?.symbol_name || symId,
        defining_path: file?.path || "",
        usages_count: count,
      };
    })
    .sort((a, b) => b.usages_count - a.usages_count)
    .slice(0, 5);

  const summary: SymbolGraphSummary = {
    totalDefinedSymbols: symbols.length,
    exportedSymbolsCount: exportedSymbols.length,
    symbolReferencesCount: references.length,
    unusedExportsCount: unusedExports.length,
    topUsedSymbols,
    unusedExports,
    allDefinedSymbols,
    allExportedSymbols,
    allReferenceEdges,
  };

  return {
    summary,
    error: null,
  };
}
