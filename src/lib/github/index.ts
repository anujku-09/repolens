import { createClient } from "@/lib/supabase/server";
import { GitHubRepo, GitTreeItem } from "@/types";

export interface FetchGitHubReposResult {
  repos: GitHubRepo[];
  error: string | null;
  isGitHubAuth: boolean;
}

export interface FetchRepositoryTreeResult {
  tree: GitTreeItem[];
  truncated: boolean;
  error: string | null;
  isGitHubAuth: boolean;
}

/**
 * Server-Side GitHub API Service
 * Securely retrieves the authenticated user's repositories from GitHub REST API
 * using the provider access token stored in the server session.
 * Never exposes tokens to the browser.
 */
export async function fetchUserGitHubRepos(): Promise<FetchGitHubReposResult> {
  const supabase = await createClient();
  
  // Retrieve current user session securely on the server
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { repos: [], error: "Unauthenticated", isGitHubAuth: false };
  }

  // Extract provider access token supplied during GitHub OAuth login
  const providerToken = session.provider_token;

  if (!providerToken) {
    // User signed up via email/password or OAuth provider token is absent
    return {
      repos: [],
      error: null,
      isGitHubAuth: false,
    };
  }

  try {
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoLens-App",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          repos: [],
          error: "GitHub authentication session expired. Please re-authenticate with GitHub.",
          isGitHubAuth: true,
        };
      }

      if (response.status === 403) {
        return {
          repos: [],
          error: "GitHub API rate limit exceeded or access forbidden. Please try again later.",
          isGitHubAuth: true,
        };
      }

      const errorText = await response.text();
      console.error("[GitHub API Error]:", response.status, errorText);
      return {
        repos: [],
        error: `GitHub API error (${response.status})`,
        isGitHubAuth: true,
      };
    }

    const data: GitHubRepo[] = await response.json();

    const formattedRepos: GitHubRepo[] = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: {
        login: repo.owner?.login || "",
        avatar_url: repo.owner?.avatar_url,
      },
      html_url: repo.html_url,
      description: repo.description || null,
      language: repo.language || null,
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
      default_branch: repo.default_branch || "main",
      private: Boolean(repo.private),
    }));

    return {
      repos: formattedRepos,
      error: null,
      isGitHubAuth: true,
    };
  } catch (err) {
    console.error("[GitHub Fetch Exception]:", err);
    return {
      repos: [],
      error: "Failed to connect to GitHub API. Network request failed.",
      isGitHubAuth: true,
    };
  }
}

/**
 * Server-Side GitHub Git Trees API Fetcher
 * Securely fetches recursive file tree for a specified repository branch.
 */
export async function fetchRepositoryTree(
  owner: string,
  repo: string,
  defaultBranch: string = "main"
): Promise<FetchRepositoryTreeResult> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { tree: [], truncated: false, error: "Unauthenticated", isGitHubAuth: false };
  }

  const providerToken = session.provider_token;

  if (!providerToken) {
    return {
      tree: [],
      truncated: false,
      error: "GitHub OAuth session provider token is unavailable. Please log in with GitHub to ingest repositories.",
      isGitHubAuth: false,
    };
  }

  const branch = defaultBranch || "main";
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoLens-App",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          tree: [],
          truncated: false,
          error: `Branch '${branch}' or repository '${owner}/${repo}' not found on GitHub.`,
          isGitHubAuth: true,
        };
      }

      if (response.status === 401) {
        return {
          tree: [],
          truncated: false,
          error: "GitHub authentication token expired. Re-authenticate via GitHub OAuth.",
          isGitHubAuth: true,
        };
      }

      if (response.status === 403) {
        return {
          tree: [],
          truncated: false,
          error: "GitHub API rate limit exceeded or access forbidden.",
          isGitHubAuth: true,
        };
      }

      return {
        tree: [],
        truncated: false,
        error: `GitHub Git Trees API returned status ${response.status}`,
        isGitHubAuth: true,
      };
    }

    const data = await response.json();

    if (!data.tree || !Array.isArray(data.tree)) {
      return {
        tree: [],
        truncated: false,
        error: "Invalid tree response received from GitHub.",
        isGitHubAuth: true,
      };
    }

    return {
      tree: data.tree as GitTreeItem[],
      truncated: Boolean(data.truncated),
      error: null,
      isGitHubAuth: true,
    };
  } catch (err) {
    console.error("[fetchRepositoryTree Exception]:", err);
    return {
      tree: [],
      truncated: false,
      error: "Failed to connect to GitHub Git Trees API.",
      isGitHubAuth: true,
    };
  }
}
