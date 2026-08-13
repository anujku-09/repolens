/**
 * Shared TypeScript domain models for RepoLens database persistence, GitHub discovery, and File Ingestion.
 */

export interface Profile {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export type RepositoryStatus = "connected" | "indexing" | "indexed" | "failed";

export interface Repository {
  id: string;
  user_id: string;
  github_repo_id: number | null;
  name: string;
  full_name: string;
  owner: string;
  url: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  status?: RepositoryStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateRepositoryInput {
  github_repo_id?: number | null;
  name: string;
  full_name: string;
  owner: string;
  url?: string | null;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  default_branch?: string;
  status?: RepositoryStatus;
}

export interface UpdateRepositoryInput {
  github_repo_id?: number | null;
  name?: string;
  full_name?: string;
  owner?: string;
  url?: string | null;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  default_branch?: string;
  status?: RepositoryStatus;
}

/**
 * GitHub REST API Repository Data Structure
 */
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  private: boolean;
}

/**
 * GitHub Git Trees API Item Structure
 */
export interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
  url?: string;
}

/**
 * Database Record for public.repository_files
 */
export interface RepositoryFile {
  id: string;
  repository_id: string;
  user_id: string;
  path: string;
  name: string;
  type: "file" | "directory";
  size: number | null;
  extension: string | null;
  language: string | null;
  parent_path: string;
  depth: number;
  created_at: string;
}

export interface RepositoryFileInsert {
  repository_id: string;
  user_id: string;
  path: string;
  name: string;
  type: "file" | "directory";
  size: number | null;
  extension: string | null;
  language: string | null;
  parent_path: string;
  depth: number;
}

/**
 * Ingestion Summary Statistics
 */
export interface IngestionSummary {
  totalFiles: number;
  totalDirectories: number;
  totalCodeSize: number;
  languageBreakdown: Record<string, { count: number; bytes: number }>;
}
