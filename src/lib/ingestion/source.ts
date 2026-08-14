import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import { fetchRepositoryFileContent } from "@/lib/github";
import { isAnalyzableSourceFile } from "@/lib/ingestion/source-policy";
import { SourceIngestionSummary, RepositoryFile } from "@/types";

const CONCURRENCY_LIMIT = 5;

export interface GetSourceSummaryResult {
  count: number;
  totalBytes: number;
  ingestedFileIds: Set<string>;
}

/**
 * Fetch summary of already ingested source file contents for a repository.
 */
export async function getRepositoryFileContentsSummary(
  repositoryId: string
): Promise<GetSourceSummaryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { count: 0, totalBytes: 0, ingestedFileIds: new Set() };
  }

  const { data, error } = await supabase
    .from("repository_file_contents")
    .select("repository_file_id, size")
    .eq("repository_id", repositoryId);

  if (error || !data) {
    return { count: 0, totalBytes: 0, ingestedFileIds: new Set() };
  }

  const ingestedFileIds = new Set<string>();
  let totalBytes = 0;

  data.forEach((row) => {
    ingestedFileIds.add(row.repository_file_id);
    totalBytes += row.size || 0;
  });

  return {
    count: data.length,
    totalBytes,
    ingestedFileIds,
  };
}

/**
 * Executes source code content ingestion for all analyzable files in a repository.
 * Fetches file contents from GitHub REST API using a controlled concurrency limit of 5.
 * Uses upsert on public.repository_file_contents to prevent duplicate records.
 */
export async function ingestRepositorySource(
  repositoryId: string
): Promise<{ success: boolean; summary?: SourceIngestionSummary; error: string | null }> {
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

  // Retrieve all file metadata records for this repository
  const files = await getRepositoryFiles(repositoryId);
  if (files.length === 0) {
    return {
      success: false,
      error: "No file tree indexed. Please run 'Ingest Repository' first to index the file tree.",
    };
  }

  const totalFiles = files.length;
  const candidateFiles: RepositoryFile[] = [];
  let skippedFiles = 0;

  files.forEach((file) => {
    if (isAnalyzableSourceFile(file)) {
      candidateFiles.push(file);
    } else {
      skippedFiles++;
    }
  });

  const analyzableFiles = candidateFiles.length;
  let ingestedFiles = 0;
  let failedFiles = 0;
  let totalBytes = 0;
  const languages: Record<string, number> = {};
  let rateLimitedHit = false;

  // Worker task to process a single candidate source file
  const processFile = async (file: RepositoryFile): Promise<boolean> => {
    if (rateLimitedHit) return false;

    const result = await fetchRepositoryFileContent(
      repository.owner,
      repository.name,
      file.path,
      repository.default_branch || "main"
    );

    if (result.isRateLimited) {
      rateLimitedHit = true;
      return false;
    }

    if (result.error || !result.content) {
      console.warn(`[ingestRepositorySource] Failed for ${file.path}: ${result.error}`);
      failedFiles++;
      return false;
    }

    const contentBytes = Buffer.byteLength(result.content, "utf-8");

    // Upsert source content record into public.repository_file_contents
    const { error: upsertError } = await supabase
      .from("repository_file_contents")
      .upsert(
        {
          repository_file_id: file.id,
          repository_id: repositoryId,
          user_id: user.id,
          content: result.content,
          sha: result.sha,
          encoding: result.encoding || "utf-8",
          size: contentBytes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "repository_file_id" }
      );

    if (upsertError) {
      console.error(`[ingestRepositorySource Upsert Error for ${file.path}]:`, upsertError);
      failedFiles++;
      return false;
    }

    ingestedFiles++;
    totalBytes += contentBytes;

    if (file.language) {
      languages[file.language] = (languages[file.language] || 0) + 1;
    }

    return true;
  };

  // Process candidate files in batches with a concurrency limit of 5
  for (let i = 0; i < candidateFiles.length; i += CONCURRENCY_LIMIT) {
    if (rateLimitedHit) break;

    const chunk = candidateFiles.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(chunk.map((file) => processFile(file)));
  }

  const summary: SourceIngestionSummary = {
    totalFiles,
    analyzableFiles,
    ingestedFiles,
    skippedFiles,
    failedFiles,
    totalBytes,
    languages,
  };

  if (rateLimitedHit) {
    return {
      success: true,
      summary,
      error: "GitHub API rate limit hit during source ingestion. Partial source content indexed.",
    };
  }

  return {
    success: true,
    summary,
    error: null,
  };
}

/**
 * Fetch raw UTF-8 source code content for a single repository file.
 */
export async function getSingleFileContent(
  fileId: string
): Promise<{ content: string | null; size: number | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { content: null, size: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("repository_file_contents")
    .select("content, size")
    .eq("repository_file_id", fileId)
    .maybeSingle();

  if (error || !data) {
    return { content: null, size: null, error: error?.message || "Source content not ingested yet." };
  }

  return {
    content: data.content,
    size: data.size,
    error: null,
  };
}
