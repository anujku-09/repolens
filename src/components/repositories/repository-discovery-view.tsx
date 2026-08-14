"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectGitHubRepositoryAction, disconnectRepositoryAction } from "@/app/repositories/actions";
import { Repository, GitHubRepo } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GithubButton } from "@/components/auth/github-button";
import {
  Search,
  FolderGit2,
  Star,
  GitFork,
  CheckCircle2,
  Plus,
  Loader2,
  ArrowUpRight,
  AlertCircle,
  Lock,
  Globe,
  GitBranch,
  Unlink,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";

interface RepositoryDiscoveryViewProps {
  connectedRepositories: Repository[];
  githubRepos: GitHubRepo[];
  gitHubAuthError: string | null;
  isGitHubAuth: boolean;
}

export function RepositoryDiscoveryView({
  connectedRepositories,
  githubRepos,
  gitHubAuthError,
  isGitHubAuth,
}: RepositoryDiscoveryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "connected" | "unconnected">("all");
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Map connected repos by github_repo_id or full_name for quick lookup
  const connectedMap = new Map<string | number, Repository>();
  connectedRepositories.forEach((repo) => {
    if (repo.github_repo_id) {
      connectedMap.set(repo.github_repo_id, repo);
    }
    connectedMap.set(repo.full_name, repo);
  });

  // Filter GitHub Repositories based on search query and active tab
  const filteredRepos = githubRepos.filter((repo) => {
    const isConnected = connectedMap.has(repo.id) || connectedMap.has(repo.full_name);

    if (activeFilter === "connected" && !isConnected) return false;
    if (activeFilter === "unconnected" && isConnected) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      repo.name.toLowerCase().includes(q) ||
      repo.full_name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q))
    );
  });

  const handleConnect = async (repo: GitHubRepo) => {
    setConnectingId(repo.id);
    setActionError(null);

    startTransition(async () => {
      const result = await connectGitHubRepositoryAction(repo);
      setConnectingId(null);

      if (result.error) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleDisconnect = async (repoId: string) => {
    setDisconnectingId(repoId);
    setActionError(null);

    startTransition(async () => {
      const result = await disconnectRepositoryAction(repoId);
      setDisconnectingId(null);

      if (result.error) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const connectedCount = githubRepos.filter(
    (repo) => connectedMap.has(repo.id) || connectedMap.has(repo.full_name)
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Non-GitHub Auth Notice */}
      {!isGitHubAuth && (
        <Card className="border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                <GithubIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">
                  Connect Your GitHub Account
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sign in or connect with GitHub OAuth to discover your repositories automatically.
                </p>
              </div>
            </div>

            <GithubButton
              label="Connect GitHub Account"
              className="bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold border-none text-xs shrink-0"
            />
          </div>
        </Card>
      )}

      {/* GitHub API Error Alert */}
      {gitHubAuthError && (
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{gitHubAuthError}</span>
        </div>
      )}

      {/* Connection Action Error Alert */}
      {actionError && (
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories by name or description..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors font-sans"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 font-mono text-xs">
          <button
            onClick={() => setActiveFilter("all")}
            className={`rounded px-3 py-1.5 transition-colors ${
              activeFilter === "all"
                ? "bg-zinc-800 text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All GitHub ({githubRepos.length})
          </button>
          <button
            onClick={() => setActiveFilter("connected")}
            className={`rounded px-3 py-1.5 transition-colors ${
              activeFilter === "connected"
                ? "bg-zinc-800 text-emerald-400 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Connected ({connectedCount})
          </button>
          <button
            onClick={() => setActiveFilter("unconnected")}
            className={`rounded px-3 py-1.5 transition-colors ${
              activeFilter === "unconnected"
                ? "bg-zinc-800 text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Available ({githubRepos.length - connectedCount})
          </button>
        </div>
      </div>

      {/* GitHub Repository Grid */}
      {filteredRepos.length === 0 ? (
        <Card className="border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4">
            <FolderGit2 className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200">
            {searchQuery ? "No matching repositories found" : "No GitHub repositories available"}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
            {searchQuery
              ? "Try clearing your search query or adjusting your filters."
              : "Sign in with GitHub to discover your remote repositories."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo) => {
            const dbRepo =
              connectedMap.get(repo.id) || connectedMap.get(repo.full_name);
            const isConnected = Boolean(dbRepo);
            const isConnecting = connectingId === repo.id;

            return (
              <Card
                key={repo.id}
                className={`border p-5 transition-all flex flex-col justify-between ${
                  isConnected
                    ? "border-emerald-500/30 bg-zinc-900/60"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-mono text-sm font-semibold text-zinc-100 truncate">
                          {repo.name}
                        </h4>
                        <p className="text-[11px] font-mono text-zinc-500 truncate">
                          {repo.owner.login}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {repo.private ? (
                        <span className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                          <Lock className="h-2.5 w-2.5" />
                          Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                          <Globe className="h-2.5 w-2.5 text-zinc-400" />
                          Public
                        </span>
                      )}
                    </div>
                  </div>

                  {repo.description ? (
                    <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                      {repo.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic mt-3">No description provided</p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-800/80 space-y-3">
                  {/* Repo Metadata Stats */}
                  <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                    <div className="flex items-center gap-3">
                      {repo.language && (
                        <span className="text-emerald-400">{repo.language}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3 text-sky-400" />
                        {repo.forks_count}
                      </span>
                    </div>
                    <span className="text-zinc-500 flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {repo.default_branch}
                    </span>
                  </div>

                  {/* Connection Button / Status */}
                  <div className="pt-1">
                    {isConnected ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="emerald" className="gap-1 py-1 text-xs font-mono">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Connected</span>
                          </Badge>
                          <Link
                            href={`/repositories/${dbRepo?.id}`}
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline font-medium font-mono"
                          >
                            <span>View Details</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>

                        {dbRepo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(dbRepo.id)}
                            disabled={disconnectingId === dbRepo.id || isPending}
                            className="w-full gap-1.5 text-xs border-zinc-800 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-mono h-8 cursor-pointer"
                          >
                            {disconnectingId === dbRepo.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                <span>Disconnecting...</span>
                              </>
                            ) : (
                              <>
                                <Unlink className="h-3 w-3" />
                                <span>Disconnect Repository</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(repo)}
                        disabled={isConnecting || isPending}
                        className="w-full gap-1.5 text-xs bg-zinc-100 text-zinc-950 hover:bg-white font-semibold h-9"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Connect Repository</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
