/**
 * Shared TypeScript domain models for RepoLens database persistence & GitHub discovery.
 */

export interface Profile {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

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
