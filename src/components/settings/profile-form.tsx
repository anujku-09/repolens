"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { updateProfileAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GithubIcon } from "@/components/ui/icons";
import {
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";

interface ProfileFormProps {
  userEmail: string;
  userId: string;
  initialProfile: Profile | null;
}

export function ProfileForm({
  userEmail,
  userId,
  initialProfile,
}: ProfileFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialProfile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUseGitHubAvatar = () => {
    const handle = username.trim() || userEmail.split("@")[0] || "octocat";
    const githubAvatar = `https://github.com/${handle}.png`;
    setAvatarUrl(githubAvatar);
  };

  const handleUseDicebearBot = () => {
    const handle = username.trim() || userEmail.split("@")[0] || "developer";
    const botAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${handle}`;
    setAvatarUrl(botAvatar);
  };

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
        setSuccessMessage("Profile updated successfully!");
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
    <Card className="border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 font-sans">
      <CardHeader className="px-0 pt-0 border-b border-zinc-800/80 pb-4 mb-5 sm:mb-6">
        <div className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-zinc-100">
              User Profile & Avatar Settings
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-0.5 text-xs">
              Customize your developer handle and profile picture across RepoLens.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={username || "Avatar"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://github.com/${username || "octocat"}.png`;
                  }}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-emerald-500/50 shadow-md ring-2 ring-emerald-500/20"
                />
              ) : (
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Developer Handle Field */}
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Developer Handle / Username
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
          <p className="text-[11px] text-zinc-500 mt-1">
            Your unique handle shown on analysis reports and user badges.
          </p>
        </div>

        {/* Avatar Image URL & Quick Actions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
              Profile Avatar Picture
            </label>
            <span className="text-[10px] font-mono text-emerald-400">
              Live Preview Active
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="relative flex-1">
              <input
                type="url"
                name="avatar_url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://avatars.githubusercontent.com/..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Quick Avatar Preset Buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseGitHubAvatar}
                className="flex-1 sm:flex-initial h-8.5 px-3 gap-1.5 text-[11px] font-mono border-zinc-800 hover:bg-zinc-800 text-zinc-300 justify-center"
              >
                <GithubIcon className="h-3.5 w-3.5 text-emerald-400" />
                <span>GitHub Avatar</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseDicebearBot}
                className="flex-1 sm:flex-initial h-8.5 px-3 gap-1.5 text-[11px] font-mono border-zinc-800 hover:bg-zinc-800 text-zinc-300 justify-center"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                <span>Dev Bot</span>
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            Paste any direct image URL, or click <strong className="text-zinc-300">GitHub Avatar</strong> to auto-fill your profile picture.
          </p>
        </div>

        {/* Clean Account Details Info Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 sm:p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400 shrink-0">Email Address</span>
            <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-semibold text-[11px] sm:text-xs truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none">
              {userEmail}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400 shrink-0">Account Integration</span>
            <span className="text-zinc-300 text-[11px] sm:text-xs flex items-center gap-1.5">
              <GithubIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>GitHub Connected</span>
            </span>
          </div>

          {initialProfile?.created_at && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400 shrink-0">Member Since</span>
              <span className="text-zinc-400 text-[11px] sm:text-xs">
                {new Date(initialProfile.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-1 flex items-center justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs h-9.5 px-5 shadow-md gap-1.5 cursor-pointer font-mono justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Changes...</span>
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
