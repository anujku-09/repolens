"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GithubButton } from "@/components/auth/github-button";
import { RepoLensLogo } from "@/components/shared/repolens-logo";
import { Loader2, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read URL error search param (e.g. from OAuth redirect callback)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "missing_auth_code") {
        setErrorMessage("Authentication failed: Missing authorization code.");
      } else {
        setErrorMessage(errorParam);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        const nextUrl = searchParams.get("next") || "/dashboard";
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err) {
      console.error("[Login Error]:", err);
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/70 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center p-0 mb-6">
        <RepoLensLogo iconOnly size="lg" className="justify-center mb-3" />
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
          Sign in to RepoLens
        </CardTitle>
        <CardDescription className="text-zinc-400 mt-1">
          Connect your developer account to manage codebase intelligence.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* GitHub OAuth Button */}
        <GithubButton
          label="Continue with GitHub"
          className="w-full border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 h-10"
          onError={(msg) => setErrorMessage(msg)}
        />

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800/80" />
          </div>
          <div className="relative bg-zinc-900 px-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            Or email
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="email" className="text-xs font-medium text-zinc-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="password" className="text-xs font-medium text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 transition-colors"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-zinc-100 text-zinc-950 hover:bg-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold text-sm shadow-md mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-3 border-t border-zinc-800/60">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-emerald-400 hover:underline font-medium">
            Sign up
          </Link>
        </div>

        <div className="text-center pt-1">
          <Link href="/" className="text-xs text-zinc-400 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 font-sans text-zinc-100">
      <Suspense fallback={
        <div className="text-xs text-zinc-500 font-mono">Loading authentication...</div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
