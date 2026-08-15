import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { CodebaseVisualizer } from "@/components/shared/codebase-visualizer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/ui/icons";
import {
  ArrowRight,
  GitGraph,
  Layers,
  Search,
  Zap,
  Terminal,
  Code,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Navbar */}
      <Navbar user={user} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-zinc-900">
          {/* Subtle Background Glow & Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Developer Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono text-emerald-400 mb-8 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Codebase Intelligence</span>
            </div>

            {/* Hero Main Heading */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-100 max-w-4xl mx-auto leading-[1.1] font-sans">
              Understand Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">Codebase</span>
            </h1>

            {/* Hero Subtitle / Description */}
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
              RepoLens analyzes GitHub repositories and helps developers understand their architecture and code.
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/repositories" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-7 bg-zinc-100 text-zinc-950 hover:bg-white dark:bg-zinc-100 dark:text-zinc-950 shadow-lg shadow-emerald-500/5">
                  <GithubIcon className="h-5 w-5" />
                  <span>Connect Repository</span>
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-7 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                  <span>View Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Minimal Command Bar Prompt */}
            <div className="mt-10 inline-flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-4 py-2 text-[11px] sm:text-xs font-mono text-zinc-400 max-w-full sm:max-w-md mx-auto overflow-x-auto custom-scrollbar">
              <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-zinc-500">$</span>
              <span className="text-zinc-300 whitespace-nowrap">npx repolens scan github.com/owner/repository</span>
            </div>
          </div>
        </section>

        {/* Visual Repository Analysis Preview Section */}
        <section id="visualizer" className="py-16 md:py-24 bg-zinc-950/60 border-b border-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="mono" className="mb-3">
                Live Analysis Engine Demo
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-100">
                Visual Codebase Architecture Inspection
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
                Explore structural file hierarchies, dependency dependencies, and component relationships in real time.
              </p>
            </div>

            {/* Codebase Visualizer Component */}
            <CodebaseVisualizer />
          </div>
        </section>

        {/* Core Capabilities / Features Grid Section */}
        <section id="features" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="emerald" className="mb-3">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Built for Modern Software Engineering
            </h2>
            <p className="mt-4 text-base text-zinc-400 max-w-2xl mx-auto">
              Designed from the ground up to give developers, team leads, and architects instant clarity into complex codebases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <Card className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-2">
                  <GitGraph className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Structural Dependency Mapping</CardTitle>
                <CardDescription className="text-zinc-400">
                  Automatically trace imports, exports, and inter-module dependencies across your entire repository.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature Card 2 */}
            <Card className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 mb-2">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Architecture Decomposition</CardTitle>
                <CardDescription className="text-zinc-400">
                  Deconstruct complex monorepos and multi-layer frameworks into understandable modular diagrams.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature Card 3 */}
            <Card className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 mb-2">
                  <Zap className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Instant Onboarding</CardTitle>
                <CardDescription className="text-zinc-400">
                  Help new engineering hires master new repos in hours instead of weeks with automated code summaries.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* CTA Bottom Banner */}
        <section className="py-16 border-t border-zinc-900 bg-gradient-to-b from-zinc-950 to-zinc-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
              Ready to gain full clarity into your codebase?
            </h2>
            <p className="mt-4 text-base text-zinc-400">
              Connect your GitHub repository and start analyzing architectural depth in seconds.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/repositories">
                <Button size="lg" className="w-full sm:w-auto gap-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-semibold border-none">
                  <GithubIcon className="h-5 w-5" />
                  <span>Connect Repository</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
