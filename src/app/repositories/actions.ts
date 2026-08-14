"use server";

import { revalidatePath } from "next/cache";
import { createRepository, getRepositories, deleteRepository } from "@/lib/repositories";
import { ingestRepositoryTree } from "@/lib/repositories/files";
import { ingestRepositorySource, getSingleFileContent } from "@/lib/ingestion/source";
import { analyzeRepository } from "@/lib/analysis/analyze-repository";
import { buildRepositoryDependencyGraph } from "@/lib/analysis/dependency/build-graph";
import { buildRepositorySymbols } from "@/lib/analysis/symbols/build-symbols";
import { buildRepositoryArchitectureScore } from "@/lib/analysis/architecture/score-architecture";
import { GitHubRepo, CreateRepositoryInput } from "@/types";

/**
 * Server Action: Connect a GitHub Repository to RepoLens.
 */
export async function connectGitHubRepositoryAction(githubRepo: GitHubRepo) {
  if (!githubRepo || !githubRepo.id || !githubRepo.full_name) {
    return { error: "Invalid repository payload." };
  }

  const userRepos = await getRepositories();
  const existingRepo = userRepos.find(
    (r) => r.github_repo_id === githubRepo.id || r.full_name === githubRepo.full_name
  );

  if (existingRepo) {
    return {
      repository: existingRepo,
      error: null,
      alreadyConnected: true,
    };
  }

  const input: CreateRepositoryInput = {
    github_repo_id: githubRepo.id,
    name: githubRepo.name,
    full_name: githubRepo.full_name,
    owner: githubRepo.owner?.login || "",
    url: githubRepo.html_url,
    description: githubRepo.description,
    language: githubRepo.language,
    stars: githubRepo.stargazers_count || 0,
    forks: githubRepo.forks_count || 0,
    default_branch: githubRepo.default_branch || "main",
    status: "connected",
  };

  const { repository, error } = await createRepository(input);

  if (error) {
    return { error };
  }

  revalidatePath("/repositories");
  revalidatePath("/dashboard");

  return { repository, error: null, alreadyConnected: false };
}

/**
 * Server Action: Ingest / Re-sync Repository File Tree from GitHub Git Trees API.
 */
export async function ingestRepositoryAction(repositoryId: string) {
  if (!repositoryId) {
    return { success: false, error: "Missing repository ID." };
  }

  const result = await ingestRepositoryTree(repositoryId);

  revalidatePath("/repositories");
  revalidatePath(`/repositories/${repositoryId}`);
  revalidatePath("/dashboard");

  return result;
}

/**
 * Server Action: Ingest Source Code Contents from GitHub Contents API.
 */
export async function ingestRepositorySourceAction(repositoryId: string) {
  if (!repositoryId) {
    return { success: false, error: "Missing repository ID." };
  }

  const result = await ingestRepositorySource(repositoryId);

  revalidatePath("/repositories");
  revalidatePath(`/repositories/${repositoryId}`);
  revalidatePath("/dashboard");

  return result;
}

/**
 * Server Action: Run AST Structural Analysis on Ingested Source Code Files.
 */
export async function analyzeRepositoryAction(repositoryId: string) {
  if (!repositoryId) {
    return { success: false, error: "Missing repository ID." };
  }

  const result = await analyzeRepository(repositoryId);

  revalidatePath("/repositories");
  revalidatePath(`/repositories/${repositoryId}`);
  revalidatePath("/dashboard");

  return result;
}

/**
 * Server Action: Build Repository Dependency Graph & Import Resolution.
 */
export async function buildDependencyGraphAction(repositoryId: string) {
  if (!repositoryId) {
    return { success: false, error: "Missing repository ID." };
  }

  const result = await buildRepositoryDependencyGraph(repositoryId);

  revalidatePath("/repositories");
  revalidatePath(`/repositories/${repositoryId}`);
  revalidatePath("/dashboard");

  return result;
}

/**
 * Server Action: Resolve Symbol Definitions & Cross-File Usages (Feature 8A).
 */
export async function buildRepositorySymbolsAction(repositoryId: string) {
  if (!repositoryId) {
    return { success: false, error: "Missing repository ID." };
  }

  const result = await buildRepositorySymbols(repositoryId);

  revalidatePath("/repositories");
  revalidatePath(`/repositories/${repositoryId}`);
  revalidatePath("/dashboard");

  return result;
}

/**
 * Server Action: Compute Architecture Health Score & Analytics (Feature 8B).
 */
export async function buildArchitectureScoreAction(repositoryId: string) {
  if (!repositoryId) {
    return { success: false, error: "Missing repository ID." };
  }

  const result = await buildRepositoryArchitectureScore(repositoryId);

  revalidatePath("/repositories");
  revalidatePath(`/repositories/${repositoryId}`);
  revalidatePath("/dashboard");

  return result;
}

/**
 * Server Action: Disconnect / Delete a repository.
 */
export async function deleteRepositoryAction(id: string) {
  const { success, error } = await deleteRepository(id);
  if (success) {
    revalidatePath("/repositories");
    revalidatePath("/dashboard");
  }
  return { success, error };
}

/**
 * Server Action: Fetch raw source code content for a single file.
 */
export async function getFileSourceAction(fileId: string) {
  if (!fileId) {
    return { content: null, size: null, error: "Missing file ID." };
  }
  return await getSingleFileContent(fileId);
}
