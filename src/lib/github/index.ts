import { createClient } from "@/lib/supabase/server";
import { GitHubRepo } from "@/types";

export interface FetchGitHubReposResult {
  repos: GitHubRepo[];
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
      // Ensure server fetches fresh data or revalidates appropriately
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
