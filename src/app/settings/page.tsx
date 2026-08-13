import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar user={user} />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="border-b border-zinc-800 pb-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Account Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your account details and platform preferences.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/40 p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg">User Profile</CardTitle>
              <CardDescription className="text-zinc-400">
                Your authenticated account details from Supabase Auth.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 text-sm">
                <span className="text-zinc-300">Email Address</span>
                <span className="font-mono text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-medium">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 text-sm">
                <span className="text-zinc-300">User ID (UUID)</span>
                <span className="font-mono text-xs text-zinc-400">
                  {user.id}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">Platform Version</span>
                <span className="font-mono text-xs text-zinc-400">v0.1.0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
