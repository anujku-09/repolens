import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRepositories } from "@/lib/repositories";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AddRepositoryForm } from "@/components/repositories/add-repository-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderGit2, ArrowUpRight, Star, GitFork } from "lucide-react";

export default async function RepositoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Strict Server-Side Route Guard - Redirect unauthenticated users to login
  if (!user) {
    redirect("/login?next=/repositories");
  }

  const repositories = await getRepositories();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Connected Repositories
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage your database-persisted repositories and inspect code intelligence.
            </p>
          </div>

          <AddRepositoryForm />
        </div>

        <div className="mt-8">
          {repositories.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4">
                <FolderGit2 className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-200">No repositories connected yet.</h2>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto mt-1 mb-6">
                Add a repository record to your Supabase database to start tracking software architecture.
              </p>
            </Card>
          ) : (
            /* Real Repositories List Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <div className="truncate max-w-[170px]">
                          <h3 className="font-mono text-sm font-semibold text-zinc-100 truncate">
                            {repo.name}
                          </h3>
                          <p className="text-xs text-zinc-500 truncate">{repo.owner}</p>
                        </div>
                      </div>
                      {repo.language && (
                        <Badge variant="emerald" className="text-[10px]">
                          {repo.language}
                        </Badge>
                      )}
                    </div>

                    {repo.description ? (
                      <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{repo.description}</p>
                    ) : (
                      <p className="text-xs text-zinc-600 italic mt-3">No description provided</p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs">
                    <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        {repo.stars}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3.5 w-3.5 text-sky-400" />
                        {repo.forks}
                      </span>
                    </div>

                    <Link
                      href={`/repositories/${repo.id}`}
                      className="flex items-center gap-1 text-emerald-400 hover:underline font-medium"
                    >
                      <span>View Repo</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
