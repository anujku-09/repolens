import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRepositories } from "@/lib/repositories";
import { fetchUserGitHubRepos } from "@/lib/github";
import { getOrCreateProfile } from "@/lib/profiles";
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

  // Fetch user profile from public.profiles
  const { profile } = await getOrCreateProfile();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} profile={profile} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4 mb-5 sm:pb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              GitHub Repositories
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Select and connect your GitHub repositories for automated codebase analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300">
              <GithubIcon className="h-4 w-4 text-emerald-400" />
              <span>{isGitHubAuth ? "GitHub OAuth Active" : "OAuth Session Ready"}</span>
            </div>
          </div>
        </div>

        {/* Client-Side Interactive Repository Discovery View */}
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
