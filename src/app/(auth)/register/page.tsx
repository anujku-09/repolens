"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GithubButton } from "@/components/auth/github-button";
import { Code2, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setConfirmationSent(false);

    // Client-side validations
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Check if session was returned directly or if email confirmation is required
      if (data.session) {
        // User authenticated immediately
        router.push("/dashboard");
      } else if (data.user) {
        // Confirmation email sent
        setConfirmationSent(true);
      }
    } catch (err) {
      console.error("[Registration Error]:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 font-sans text-zinc-100">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/70 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <CardHeader className="text-center p-0 mb-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 mb-3 shadow-sm">
            <Code2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
            Create your Account
          </CardTitle>
          <CardDescription className="text-zinc-400 mt-1">
            Start analyzing repositories and mapping software architecture.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* Validation or Supabase Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email Confirmation Success Banner */}
          {confirmationSent && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <Mail className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">Confirmation email sent!</p>
                <p className="mt-0.5 text-emerald-400/90">
                  Please check your email inbox to confirm your registration before signing in.
                </p>
              </div>
            </div>
          )}

          {/* GitHub OAuth Sign Up Button */}
          <GithubButton
            label="Sign up with GitHub"
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

          {/* Registration Form */}
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
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 transition-colors"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-zinc-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
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
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-zinc-500 pt-3 border-t border-zinc-800/60">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline font-medium">
              Sign in
            </Link>
          </div>

          <div className="text-center pt-1">
            <Link href="/" className="text-xs text-zinc-400 hover:underline">
              &larr; Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
