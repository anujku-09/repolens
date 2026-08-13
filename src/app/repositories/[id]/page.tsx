import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GitBranch, Star, GitFork, Calendar, ExternalLink, ShieldCheck, Layers } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function RepositoryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const repoId = resolvedParams.id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authentication check
  if (!user) {
    redirect("/login");
  }

  // Fetch real repository from database (RLS ensures user ownership)
  const repository = await getRepositoryById(repoId);

  // If repository doesn't exist or belongs to another user, trigger Next.js 404
  if (!repository) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/repositories"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Repositories</span>
          </Link>
        </div>

        {/* Real Repository Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-zinc-100">
                {repository.full_name}
              </h1>
              {repository.language && (
                <Badge variant="emerald" className="font-mono text-xs">
                  {repository.language}
                </Badge>
              )}
              <Badge variant="mono" className="text-xs">
                Owner: {repository.owner}
              </Badge>
            </div>

            {repository.description && (
              <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                {repository.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 border border-zinc-800 rounded-lg px-3 py-1.5 bg-zinc-900/60">
              <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
              <span>Branch: {repository.default_branch || "main"}</span>
            </div>

            {repository.url && (
              <a
                href={repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Real Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <Star className="h-4 w-4 text-amber-400" />
                <span>Stars</span>
              </CardDescription>
              <CardTitle className="text-2xl font-mono text-zinc-100 mt-1">
                {repository.stars}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <GitFork className="h-4 w-4 text-sky-400" />
                <span>Forks</span>
              </CardDescription>
              <CardTitle className="text-2xl font-mono text-zinc-100 mt-1">
                {repository.forks}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-5">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>Connected Date</span>
              </CardDescription>
              <CardTitle className="text-lg font-mono text-zinc-100 mt-1">
                {formatDate(repository.created_at)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Repository Record Overview */}
        <Card className="border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-zinc-100">Repository Details</h3>
          </div>
          <div className="space-y-3 text-xs font-mono text-zinc-400 border-t border-zinc-800/80 pt-4">
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Record ID</span>
              <span className="text-zinc-200">{repository.id}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Owner User ID</span>
              <span className="text-zinc-200">{repository.user_id}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Repository Name</span>
              <span className="text-zinc-200">{repository.name}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Default Branch</span>
              <span className="text-zinc-200">{repository.default_branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">RLS Status</span>
              <span className="text-emerald-400">Protected &amp; Enforced</span>
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
