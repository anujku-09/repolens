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

export interface FetchFileContentResult {
  content: string | null;
  sha: string | null;
  size: number;
  encoding: string;
  error: string | null;
  isRateLimited?: boolean;
}

/**
  * Helper to build GitHub API headers.
  * Uses user's OAuth provider token if present, or falls back to GITHUB_TOKEN env var,
  * or makes an unauthenticated request for public repositories.
  */
function getGitHubAuthHeaders(providerToken?: string | null): Record<string, string> {
  const token =
    providerToken ||
    process.env.GITHUB_TOKEN ||
    process.env.NEXT_PUBLIC_GITHUB_TOKEN ||
    process.env.GH_TOKEN;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "RepoLens-App",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
  * Server-Side GitHub API Service: List user repositories.
  */
export async function fetchUserGitHubRepos(): Promise<FetchGitHubReposResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { repos: [], error: "Unauthenticated", isGitHubAuth: false };
  }

  const providerToken = session.provider_token;
  const token =
    providerToken ||
    process.env.GITHUB_TOKEN ||
    process.env.NEXT_PUBLIC_GITHUB_TOKEN ||
    process.env.GH_TOKEN;

  if (!token) {
    return {
      repos: [],
      error: null,
      isGitHubAuth: false,
    };
  }

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100",
      {
        headers: getGitHubAuthHeaders(providerToken),
        next: { revalidate: 60 },
      }
    );

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
          error: "GitHub API rate limit exceeded. Please try again later.",
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
      error: "Failed to connect to GitHub API.",
      isGitHubAuth: true,
    };
  }
}

/**
  * Server-Side GitHub Git Trees API Fetcher.
  * Works seamlessly for both public repos (no token needed) and private repos (with OAuth/ENV token).
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

  const providerToken = session?.provider_token || null;
  const branch = defaultBranch || "main";
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  try {
    const response = await fetch(url, {
      headers: getGitHubAuthHeaders(providerToken),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          tree: [],
          truncated: false,
          error: `Branch '${branch}' or repository '${owner}/${repo}' not found on GitHub.`,
          isGitHubAuth: Boolean(providerToken),
        };
      }

      if (response.status === 401 || response.status === 403) {
        if (!providerToken && !process.env.GITHUB_TOKEN) {
          return {
            tree: [],
            truncated: false,
            error: "Private repository access requires GitHub OAuth login or GITHUB_TOKEN environment variable.",
            isGitHubAuth: false,
          };
        }
        return {
          tree: [],
          truncated: false,
          error: "GitHub API rate limit exceeded or access forbidden. Please re-authenticate.",
          isGitHubAuth: Boolean(providerToken),
        };
      }

      return {
        tree: [],
        truncated: false,
        error: `GitHub API returned status ${response.status}`,
        isGitHubAuth: Boolean(providerToken),
      };
    }

    const data = await response.json();

    if (!data.tree || !Array.isArray(data.tree)) {
      return {
        tree: [],
        truncated: false,
        error: "Invalid tree response received from GitHub.",
        isGitHubAuth: Boolean(providerToken),
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
      isGitHubAuth: Boolean(providerToken),
    };
  }
}

/**
  * Server-Side GitHub Contents & Raw Source Fetcher.
  * Fast, unauthenticated raw content fetch for public repos with GitHub REST API fallback.
  */
export async function fetchRepositoryFileContent(
  owner: string,
  repo: string,
  path: string,
  defaultBranch: string = "main"
): Promise<FetchFileContentResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token || null;
  const branch = defaultBranch || "main";

  // 1. Fast Unauthenticated Raw Content Fetch for Public Repositories
  try {
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path}`;
    const rawResponse = await fetch(rawUrl, {
      headers: { "User-Agent": "RepoLens-App" },
      cache: "no-store",
    });

    if (rawResponse.ok) {
      const utf8Content = await rawResponse.text();
      return {
        content: utf8Content,
        sha: null,
        size: Buffer.byteLength(utf8Content, "utf-8"),
        encoding: "utf-8",
        error: null,
      };
    }
  } catch (rawErr) {
    // Suppress raw error and attempt REST API fallback
  }

  // 2. Fallback to GitHub REST API (handles private repositories & token auth)
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

  try {
    const response = await fetch(url, {
      headers: getGitHubAuthHeaders(providerToken),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 403) {
        return {
          content: null,
          sha: null,
          size: 0,
          encoding: "utf-8",
          error: "GitHub API rate limit exceeded.",
          isRateLimited: true,
        };
      }

      if (response.status === 404) {
        return {
          content: null,
          sha: null,
          size: 0,
          encoding: "utf-8",
          error: `File path '${path}' not found on branch '${branch}'.`,
        };
      }

      return {
        content: null,
        sha: null,
        size: 0,
        encoding: "utf-8",
        error: `GitHub Contents API status ${response.status}`,
      };
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return {
        content: null,
        sha: null,
        size: 0,
        encoding: "utf-8",
        error: `Path '${path}' resolves to a directory, not a file.`,
      };
    }

    const rawContent = data.content || "";
    const sha = data.sha || null;
    const size = typeof data.size === "number" ? data.size : 0;
    const encoding = data.encoding || "base64";

    let utf8Content = "";
    if (encoding === "base64") {
      utf8Content = Buffer.from(rawContent, "base64").toString("utf-8");
    } else {
      utf8Content = rawContent;
    }

    return {
      content: utf8Content,
      sha,
      size,
      encoding: "utf-8",
      error: null,
    };
  } catch (err) {
    console.error(`[fetchRepositoryFileContent Exception for ${path}]:`, err);
    return {
      content: null,
      sha: null,
      size: 0,
      encoding: "utf-8",
      error: `Failed to fetch file content for ${path}`,
    };
  }
}
