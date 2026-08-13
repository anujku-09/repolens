"use server";

import { revalidatePath } from "next/cache";
import { createRepository, getRepositories, deleteRepository } from "@/lib/repositories";
import { ingestRepositoryTree } from "@/lib/repositories/files";
import { GitHubRepo, CreateRepositoryInput } from "@/types";

/**
 * Server Action: Connect a GitHub Repository to RepoLens.
 * Persists the GitHub repository metadata into the public.repositories table.
 * Derived user_id is enforced on the server.
 */
export async function connectGitHubRepositoryAction(githubRepo: GitHubRepo) {
  if (!githubRepo || !githubRepo.id || !githubRepo.full_name) {
    return { error: "Invalid repository payload." };
  }

  // Check if repository is already connected for this user
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
