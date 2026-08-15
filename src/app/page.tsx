import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { CodebaseVisualizer } from "@/components/shared/codebase-visualizer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/ui/icons";
import {
  ArrowRight,
  GitGraph,
  Layers,
  Terminal,
  Sparkles,
  ShieldCheck,
  Code2,
  Boxes,
  Activity,
  Zap,
  Flame,
  Search,
  CheckCircle2,
  Bot,
  FileCode,
} from "lucide-react";

import { getOrCreateProfile } from "@/lib/profiles";
import { RepoLensLogo } from "@/components/shared/repolens-logo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch or auto-create user profile in public.profiles
  const { profile } = user ? await getOrCreateProfile() : { profile: null };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Navbar */}
      <Navbar user={user} profile={profile} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-10 md:pt-16 md:pb-14 border-b border-zinc-900">
          {/* Subtle Background Glow & Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 blur-[140px] rounded-full pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Cinematic RepoLens Hero Brand Showcase */}
            <div className="flex justify-center mb-6">
              <RepoLensLogo iconOnly size="hero" showGlow />
            </div>

            {/* Developer Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono text-emerald-400 mb-5 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Codebase Intelligence Engine</span>
            </div>

            {/* Hero Main Heading */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-100 max-w-4xl mx-auto leading-[1.15] font-sans">
              Understand Your Entire{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                Codebase Architecture
              </span>
            </h1>

            {/* Hero Subtitle */}
            <p className="mt-4 text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
              RepoLens automatically parses GitHub repositories into interactive AST graphs, cross-module symbol maps, and architectural health scores.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href="/repositories" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 text-sm sm:text-base px-6 h-11 bg-zinc-100 text-zinc-950 hover:bg-white dark:bg-zinc-100 dark:text-zinc-950 shadow-lg shadow-emerald-500/5 font-semibold"
                >
                  <GithubIcon className="h-5 w-5" />
                  <span>Connect Repository</span>
                </Button>
              </Link>

              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto gap-2 text-sm sm:text-base px-6 h-11 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 font-mono"
                >
                  <span>Open Intelligence Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-emerald-400" />
                </Button>
              </Link>
            </div>

            {/* Minimal Command Bar Prompt */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-4 py-2 text-[11px] sm:text-xs font-mono text-zinc-400 max-w-full sm:max-w-md mx-auto overflow-x-auto custom-scrollbar">
              <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-zinc-500">$</span>
              <span className="text-zinc-300 whitespace-nowrap">
                npx repolens scan github.com/owner/repository
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-zinc-900 text-left font-mono">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
                <div className="text-emerald-400 text-sm font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Native AST Parsing</span>
                </div>
                <div className="text-zinc-400 text-xs mt-1">TypeScript, TSX, JS & Python</div>
              </div>

              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
                <div className="text-purple-400 text-sm font-bold flex items-center gap-1.5">
                  <Boxes className="h-4 w-4" />
                  <span>SVG Network Graph</span>
                </div>
                <div className="text-zinc-400 text-xs mt-1">Rings & Architectural Columns</div>
              </div>

              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
                <div className="text-sky-400 text-sm font-bold flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span>Coupling & Health</span>
                </div>
                <div className="text-zinc-400 text-xs mt-1">Automated 0-100 Health Score</div>
              </div>

              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
                <div className="text-amber-400 text-sm font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Supabase RLS</span>
                </div>
                <div className="text-zinc-400 text-xs mt-1">Secure User Tenant Isolation</div>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Repository Analysis Preview Section */}
        <section id="visualizer" className="py-10 md:py-14 bg-zinc-950/60 border-b border-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <Badge variant="mono" className="mb-2">
                Live Analysis Engine Demo
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-100">
                Visual Codebase Architecture Inspection
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                Explore structural file hierarchies, inter-module dependencies, and component relationships in real time.
              </p>
            </div>

            {/* Codebase Visualizer Component */}
            <CodebaseVisualizer />
          </div>
        </section>

        {/* Platform Capabilities Showcase Section */}
        <section id="features" className="py-10 md:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="emerald" className="mb-2">
              6 Core Intelligence Engines
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-100">
              Built for Modern Software Engineering
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl mx-auto">
              Everything you need to analyze software debt, trace circular imports, detect dead code, and generate LLM context payloads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-emerald-500/40 transition-colors">
              <CardHeader className="p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
                  <GitGraph className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  Structural Dependency Mapping
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Automatically trace internal imports, external package links, and circular import loops across your repository.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-purple-500/40 transition-colors">
              <CardHeader className="p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-3 border border-purple-500/20">
                  <Boxes className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  Interactive SVG Visualizer
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Switch between Concentric Rings and Architectural Columns layouts with live node search, zoom, and panning.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-amber-500/40 transition-colors">
              <CardHeader className="p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-3 border border-amber-500/20">
                  <Code2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  Symbol & Orphan Detection
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Map defined functions, classes, and exported symbols across files to immediately pinpoint unreferenced orphan code.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-sky-500/40 transition-colors">
              <CardHeader className="p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 mb-3 border border-sky-500/20">
                  <Activity className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  Architectural Health Scoring
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Calculate Instability (I = Ce / (Ca + Ce)), Coupling, and Modularity with an automated 0-100 health score.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-rose-500/40 transition-colors">
              <CardHeader className="p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/20">
                  <Flame className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  Change Impact Analysis
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Simulate modifying any source file to assess blast radius, transitive dependents, and risk tiers before committing.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="border-zinc-800 bg-zinc-900/40 p-5 hover:border-cyan-500/40 transition-colors">
              <CardHeader className="p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-3 border border-cyan-500/20">
                  <Bot className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  AI Context Payload Generator
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Format noise-free structural AST payloads into clean Markdown prompts ready to paste directly into Cursor, Claude, or ChatGPT.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* CTA Bottom Banner */}
        <section className="py-12 border-t border-zinc-900 bg-gradient-to-b from-zinc-950 to-zinc-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Ready to gain full clarity into your codebase?
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-zinc-400">
              Connect your GitHub repository and start analyzing architectural depth in seconds.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/repositories">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold border-none text-xs sm:text-sm h-10 px-6 cursor-pointer"
                >
                  <GithubIcon className="h-4 w-4" />
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
