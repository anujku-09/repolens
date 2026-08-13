/**
 * Shared TypeScript domain models for RepoLens database persistence.
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
