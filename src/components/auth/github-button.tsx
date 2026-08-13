"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/icons";
import { Loader2 } from "lucide-react";

interface GithubButtonProps {
  label?: string;
  className?: string;
  onError?: (errorMsg: string) => void;
}

export function GithubButton({
  label = "Continue with GitHub",
  className,
  onError,
}: GithubButtonProps) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const handleGithubSignIn = async () => {
    setLoading(true);
    try {
      const nextParam = searchParams?.get("next");
      const redirectUrl = nextParam
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
        : `${window.location.origin}/auth/callback`;

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        if (onError) {
          onError(error.message);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("[GitHub OAuth Exception]:", err);
      if (onError) {
        onError("An unexpected error occurred while connecting to GitHub.");
      }
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGithubSignIn}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-zinc-400" />
          <span>Connecting to GitHub...</span>
        </>
      ) : (
        <>
          <GithubIcon className="h-4 w-4 mr-2 text-zinc-200" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
