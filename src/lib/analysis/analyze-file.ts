import ts from "typescript";
import { createClient } from "@/lib/supabase/server";
import { isTypeScriptAstSupported, isPythonSupported, parseTypeScriptSource } from "@/lib/analysis/ast/parser";
import { extractStructuralFacts } from "@/lib/analysis/ast/extractor";
import { extractPythonStructuralFacts } from "@/lib/analysis/ast/python-extractor";
import { RepositoryFileAnalysis, FileAnalysisPayload } from "@/types";

export interface AnalyzeFileResult {
  success: boolean;
  status: "analyzed" | "unsupported" | "failed";
  record?: RepositoryFileAnalysis;
  error?: string | null;
}

/**
 * Analyzes a single repository source file by parsing its AST and extracting structural facts.
 * Persists the analysis into public.repository_file_analysis table via Supabase RLS.
 */
export async function analyzeRepositoryFile(
  repositoryFileId: string
): Promise<AnalyzeFileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { success: false, status: "failed", error: "Unauthorized: Log in first." };
  }

  // 1. Fetch file metadata record
  const { data: file, error: fileError } = await supabase
    .from("repository_files")
    .select("*")
    .eq("id", repositoryFileId)
    .single();

  if (fileError || !file) {
    return { success: false, status: "failed", error: "Repository file not found." };
  }

  // 2. Fetch file content record from public.repository_file_contents
  const { data: fileContent, error: contentError } = await supabase
    .from("repository_file_contents")
    .select("*")
    .eq("repository_file_id", repositoryFileId)
    .single();

  if (contentError || !fileContent || !fileContent.content) {
    return {
      success: false,
      status: "failed",
      error: "Source code content not ingested yet. Run 'Ingest Source Code' first.",
    };
  }

  const language = file.language || file.extension || "unknown";

  // 3. Handle Python AST extraction
  if (isPythonSupported(file.path)) {
    const pythonPayload = extractPythonStructuralFacts(fileContent.content);

    const { data: pythonRecord, error: upsertError } = await supabase
      .from("repository_file_analysis")
      .upsert(
        {
          repository_file_id: repositoryFileId,
          repository_id: file.repository_id,
          user_id: user.id,
          language: "python",
          parser: "python_regex_ast",
          parser_version: "1.0",
          analysis: pythonPayload,
          imports_count: pythonPayload.imports.length,
          exports_count: pythonPayload.exports.length,
          functions_count: pythonPayload.functions.length,
          classes_count: pythonPayload.classes.length,
          variables_count: pythonPayload.variables.length,
          components_count: 0,
          status: "analyzed",
          error_message: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "repository_file_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[analyzeRepositoryFile Python Upsert Error]:", upsertError);
      return { success: false, status: "failed", error: upsertError.message };
    }

    return {
      success: true,
      status: "analyzed",
      record: pythonRecord as RepositoryFileAnalysis,
    };
  }

  // 4. Handle unsupported extensions safely without failing the repository
  if (!isTypeScriptAstSupported(file.path)) {
    const emptyPayload: FileAnalysisPayload = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: [],
      components: [],
    };

    const { data: inserted, error: insertError } = await supabase
      .from("repository_file_analysis")
      .upsert(
        {
          repository_file_id: repositoryFileId,
          repository_id: file.repository_id,
          user_id: user.id,
          language,
          parser: "none",
          parser_version: null,
          analysis: emptyPayload,
          imports_count: 0,
          exports_count: 0,
          functions_count: 0,
          classes_count: 0,
          variables_count: 0,
          components_count: 0,
          status: "unsupported",
          error_message: `AST parser for '${language}' is not available yet.`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "repository_file_id" }
      )
      .select()
      .single();

    if (insertError) {
      console.error("[analyzeRepositoryFile Unsupported Upsert Error]:", insertError);
      return { success: false, status: "failed", error: insertError.message };
    }

    return {
      success: true,
      status: "unsupported",
      record: inserted as RepositoryFileAnalysis,
    };
  }

  // 4. Parse TypeScript / JavaScript AST
  const sourceFile = parseTypeScriptSource(file.path, fileContent.content);

  if (!sourceFile) {
    const emptyPayload: FileAnalysisPayload = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: [],
      components: [],
    };

    const { data: failedRecord, error: insertError } = await supabase
      .from("repository_file_analysis")
      .upsert(
        {
          repository_file_id: repositoryFileId,
          repository_id: file.repository_id,
          user_id: user.id,
          language,
          parser: "typescript",
          parser_version: ts.version,
          analysis: emptyPayload,
          imports_count: 0,
          exports_count: 0,
          functions_count: 0,
          classes_count: 0,
          variables_count: 0,
          components_count: 0,
          status: "failed",
          error_message: "TypeScript compiler failed to parse source code AST.",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "repository_file_id" }
      )
      .select()
      .single();

    if (insertError) {
      console.error("[analyzeRepositoryFile Failed Upsert Error]:", insertError);
    }

    return {
      success: false,
      status: "failed",
      record: failedRecord as RepositoryFileAnalysis,
      error: "Syntax parse error",
    };
  }

  // 5. Extract structural facts
  try {
    const payload = extractStructuralFacts(sourceFile);

    const { data: analyzedRecord, error: upsertError } = await supabase
      .from("repository_file_analysis")
      .upsert(
        {
          repository_file_id: repositoryFileId,
          repository_id: file.repository_id,
          user_id: user.id,
          language,
          parser: "typescript",
          parser_version: ts.version,
          analysis: payload,
          imports_count: payload.imports.length,
          exports_count: payload.exports.length,
          functions_count: payload.functions.length,
          classes_count: payload.classes.length,
          variables_count: payload.variables.length,
          components_count: payload.components.length,
          status: "analyzed",
          error_message: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "repository_file_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[analyzeRepositoryFile Analyzed Upsert Error]:", upsertError);
      return { success: false, status: "failed", error: upsertError.message };
    }

    return {
      success: true,
      status: "analyzed",
      record: analyzedRecord as RepositoryFileAnalysis,
    };
  } catch (err) {
    console.error(`[analyzeRepositoryFile Exception for ${file.path}]:`, err);
    return {
      success: false,
      status: "failed",
      error: `AST extraction failed for ${file.path}`,
    };
  }
}
