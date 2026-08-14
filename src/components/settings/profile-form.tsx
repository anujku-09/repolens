"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { updateProfileAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";

interface ProfileFormProps {
  userEmail: string;
  userId: string;
  initialProfile: Profile | null;
}

export function ProfileForm({ userEmail, userId, initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialProfile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("username", username);
    formData.append("avatar_url", avatarUrl);

    try {
      const result = await updateProfileAction(formData);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to update profile.");
      } else {
        setSuccessMessage("Profile updated successfully in public.profiles table!");
        router.refresh();
      }
    } catch (err) {
      console.error("[ProfileForm Error]:", err);
      setErrorMessage("An unexpected error occurred while saving profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 p-6">
      <CardHeader className="px-0 pt-0 border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">User Profile Settings</CardTitle>
            <CardDescription className="text-zinc-400 mt-0.5">
              Manage your public profile username and avatar stored in <code className="text-emerald-400 font-mono">public.profiles</code>.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={username || "Avatar"}
                className="h-11 w-11 rounded-full object-cover border-2 border-emerald-500/40 shadow-md"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <User className="h-5 w-5 text-emerald-400" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username Field */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wider mb-1.5">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
              @
            </span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. anujku-09"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-7 pr-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-sans">
            Your unique handle used across RepoLens.
          </p>
        </div>

        {/* Avatar URL Field */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wider mb-1.5">
            Avatar Image URL
          </label>
          <input
            type="url"
            name="avatar_url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://avatars.githubusercontent.com/..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
          />
          <p className="text-[11px] text-zinc-500 mt-1 font-sans">
            Direct image link for your profile picture.
          </p>
        </div>

        {/* User Account Info Details */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-3 font-mono text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300">Email Address</span>
            <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-semibold">
              {userEmail}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300">Supabase User ID</span>
            <span className="text-zinc-400 text-[11px] break-all">{userId}</span>
          </div>

          {initialProfile?.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Profile Created</span>
              <span className="text-zinc-500 text-[11px]">
                {new Date(initialProfile.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs h-9 shadow-md gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Profile Changes</span>
              </>
            )}
          </Button>
        </div>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-mono">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </Card>
  );
}
