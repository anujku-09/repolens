import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profiles";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch or auto-create profile record in public.profiles table
  const { profile } = await getOrCreateProfile();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} profile={profile} />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="border-b border-zinc-800 pb-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Account & Profile Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your public profile username, avatar, and account preferences in RepoLens.
          </p>
        </div>

        <div className="space-y-6">
          <ProfileForm
            userEmail={user.email || ""}
            userId={user.id}
            initialProfile={profile}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
