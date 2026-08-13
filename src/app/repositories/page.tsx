import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRepositories } from "@/lib/repositories";
import { fetchUserGitHubRepos } from "@/lib/github";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { RepositoryDiscoveryView } from "@/components/repositories/repository-discovery-view";
import { GithubIcon } from "@/components/ui/icons";

export default async function RepositoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Strict Server-Side Protection
  if (!user) {
    redirect("/login?next=/repositories");
  }

  // Fetch connected database repositories for current user
  const connectedRepositories = await getRepositories();

  // Fetch available GitHub repositories from GitHub REST API
  const { repos: githubRepos, error: gitHubAuthError, isGitHubAuth } = await fetchUserGitHubRepos();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                GitHub Repository Discovery
              </h1>
              <span className="flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-xs text-emerald-400">
                <GithubIcon className="h-3.5 w-3.5 text-zinc-300" />
                <span>REST API v3</span>
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Select and connect your GitHub repositories to start mapping software architecture.
            </p>
          </div>
        </div>

        {/* GitHub Discovery & Connection Interface */}
        <RepositoryDiscoveryView
          connectedRepositories={connectedRepositories}
          githubRepos={githubRepos}
          gitHubAuthError={gitHubAuthError}
          isGitHubAuth={isGitHubAuth}
        />
      </main>
      <Footer />
    </div>
  );
}
