import { createClient } from "@/lib/supabase/server";
import { getRepositoryById, updateRepository } from "@/lib/repositories";
import { fetchRepositoryTree } from "@/lib/github";
import { parseGitTreeToRepositoryFiles } from "@/lib/ingestion/parser";
import { RepositoryFile, RepositoryFileInsert, IngestionSummary } from "@/types";

const BATCH_SIZE = 500;

/**
 * Fetch all ingested repository files for a repository owned by the authenticated user.
 * Enforces PostgreSQL Row Level Security (RLS).
 */
export async function getRepositoryFiles(repositoryId: string): Promise<RepositoryFile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("repository_files")
    .select("*")
    .eq("repository_id", repositoryId)
    .order("path", { ascending: true });

  if (error) {
    console.error("[getRepositoryFiles Error]:", error);
    return [];
  }

  return (data as RepositoryFile[]) || [];
}

/**
 * Bulk Insert repository file records into public.repository_files in batches to avoid payload limits.
 */
async function bulkInsertRepositoryFiles(records: RepositoryFileInsert[]): Promise<{ error: string | null }> {
  const supabase = await createClient();

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("repository_files").insert(chunk);

    if (error) {
      console.error(`[bulkInsertRepositoryFiles Batch Error (Index ${i})]:`, error);
      return { error: error.message };
    }
  }

  return { error: null };
}

/**
 * Executes full repository file tree ingestion & AST parsing for a connected repository.
 * 1. Updates repository status -> 'indexing'
 * 2. Fetches Git Tree via GitHub API
 * 3. Parses files, extensions, languages & hierarchy
 * 4. Clears previous file records
 * 5. Bulk inserts file records in 500-row chunks
 * 6. Updates repository status -> 'indexed' (or 'failed')
 */
export async function ingestRepositoryTree(
  repositoryId: string
): Promise<{ success: boolean; summary?: IngestionSummary; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: Please log in first." };
  }

  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    return { success: false, error: "Repository not found or access denied." };
  }

  // 1. Update status to 'indexing'
  await updateRepository(repositoryId, { status: "indexing" });

  // 2. Fetch Git Tree from GitHub API
  const treeResult = await fetchRepositoryTree(
    repository.owner,
    repository.name,
    repository.default_branch || "main"
  );

  if (treeResult.error || treeResult.tree.length === 0) {
    const errorMsg = treeResult.error || "GitHub repository tree is empty.";
    await updateRepository(repositoryId, { status: "failed" });
    return { success: false, error: errorMsg };
  }

  try {
    // 3. Parse Git Tree
    const { records, summary } = parseGitTreeToRepositoryFiles(
      repositoryId,
      user.id,
      treeResult.tree
    );

    // 4. Delete existing file records for this repository
    const { error: deleteError } = await supabase
      .from("repository_files")
      .delete()
      .eq("repository_id", repositoryId);

    if (deleteError) {
      console.error("[ingestRepositoryTree Delete Error]:", deleteError);
      await updateRepository(repositoryId, { status: "failed" });
      return { success: false, error: "Failed to clear previous file records." };
    }

    // 5. Bulk insert records in batches
    const { error: insertError } = await bulkInsertRepositoryFiles(records);

    if (insertError) {
      await updateRepository(repositoryId, { status: "failed" });
      return { success: false, error: `Failed to insert file records: ${insertError}` };
    }

    // 6. Update repository status to 'indexed'
    await updateRepository(repositoryId, { status: "indexed" });

    return {
      success: true,
      summary,
      error: null,
    };
  } catch (err) {
    console.error("[ingestRepositoryTree Exception]:", err);
    await updateRepository(repositoryId, { status: "failed" });
    return { success: false, error: "An unexpected error occurred during repository ingestion." };
  }
}
