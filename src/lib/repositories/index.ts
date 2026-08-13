import { createClient } from "@/lib/supabase/server";
import { Repository, CreateRepositoryInput, UpdateRepositoryInput } from "@/types";

/**
 * Server-Side Repository Data Layer
 * Handles database operations using the user's authenticated Supabase server client.
 * PostgreSQL Row Level Security (RLS) automatically enforces user-level data ownership.
 */

export async function getRepositories(): Promise<Repository[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getRepositories Error]:", error);
    return [];
  }

  return (data as Repository[]) || [];
}

export async function getRepositoryById(id: string): Promise<Repository | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("[getRepositoryById Error]:", error);
    }
    return null;
  }

  return data as Repository;
}

export async function createRepository(
  input: CreateRepositoryInput
): Promise<{ repository: Repository | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { repository: null, error: "Unauthorized: Please log in first." };
  }

  const newRepo = {
    user_id: user.id, // Derived securely server-side from authenticated user session
    name: input.name.trim(),
    full_name: input.full_name.trim(),
    owner: input.owner.trim(),
    url: input.url || null,
    description: input.description || null,
    language: input.language || "TypeScript",
    stars: input.stars ?? 0,
    forks: input.forks ?? 0,
    default_branch: input.default_branch || "main",
  };

  const { data, error } = await supabase
    .from("repositories")
    .insert(newRepo)
    .select("*")
    .single();

  if (error) {
    console.error("[createRepository Error]:", error);
    return { repository: null, error: error.message };
  }

  return { repository: data as Repository, error: null };
}

export async function updateRepository(
  id: string,
  input: UpdateRepositoryInput
): Promise<{ repository: Repository | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { repository: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("repositories")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[updateRepository Error]:", error);
    return { repository: null, error: error.message };
  }

  return { repository: data as Repository, error: null };
}

export async function deleteRepository(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("repositories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteRepository Error]:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
