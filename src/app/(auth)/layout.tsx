import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-Side Auth Layout Guard.
 * If an already authenticated user attempts to access /login or /register,
 * redirect them directly to /dashboard.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
