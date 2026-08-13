import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRepositories } from "@/lib/repositories";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Plus, FolderGit2, ShieldCheck, Star, GitFork, Code } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repositories = await getRepositories();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 font-sans text-zinc-100">
      {/* Top Header & Authenticated User Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Intelligence Dashboard
            </h1>
            <Badge variant="emerald" className="gap-1 font-mono text-[11px]">
              <ShieldCheck className="h-3 w-3" />
              <span>Authenticated</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
            <span>Logged in as:</span>
            <span className="font-mono text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {user?.email ?? "User"}
            </span>
          </div>
        </div>

        <Link href="/repositories">
          <Button size="sm" className="gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white font-semibold">
            <Plus className="h-4 w-4" />
            <span>Connect Repository</span>
          </Button>
        </Link>
      </div>

      {/* Real Real-Time Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
        <Card className="border-zinc-800 bg-zinc-900/50 p-6">
          <CardHeader className="p-0">
            <CardDescription className="text-zinc-400">Total Repositories</CardDescription>
            <CardTitle className="text-3xl font-mono text-zinc-100 mt-1">
              {repositories.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 p-6">
          <CardHeader className="p-0">
            <CardDescription className="text-zinc-400">Database Connection Status</CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-sm font-semibold text-emerald-400">Active (Supabase RLS)</span>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Real Repositories Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-200">Your Repositories</h2>
          {repositories.length > 0 && (
            <span className="text-xs font-mono text-zinc-500">
              Showing {repositories.length} repository{repositories.length === 1 ? "" : "ies"}
            </span>
          )}
        </div>

        {repositories.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4">
              <FolderGit2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">No repositories connected yet.</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto mt-1 mb-6">
              Connect or add your first repository to store database records and track code metrics.
            </p>
            <Link href="/repositories">
              <Button size="sm" className="gap-2 bg-zinc-100 text-zinc-950 hover:bg-white font-semibold">
                <Plus className="h-4 w-4" />
                <span>Add Your First Repository</span>
              </Button>
            </Link>
          </Card>
        ) : (
          /* Real Repository List Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <Card
                key={repo.id}
                className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <FolderGit2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-mono text-sm font-semibold text-zinc-100">{repo.full_name}</h3>
                        <p className="text-xs text-zinc-500">Owner: {repo.owner}</p>
                      </div>
                    </div>
                    {repo.language && (
                      <Badge variant="mono" className="text-[10px]">
                        {repo.language}
                      </Badge>
                    )}
                  </div>

                  {repo.description && (
                    <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{repo.description}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
                  <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3 text-sky-400" />
                      {repo.forks}
                    </span>
                  </div>

                  <Link
                    href={`/repositories/${repo.id}`}
                    className="flex items-center gap-1 text-emerald-400 hover:underline font-medium"
                  >
                    <span>View Repository</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
