import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types";

/**
 * Retrieves the current authenticated user's profile from public.profiles.
 * Auto-creates & populates profile record if it doesn't exist yet using GitHub / Auth metadata.
 */
export async function getOrCreateProfile(): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, error: "Unauthorized" };
  }

  // 1. Query existing profile record
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    console.error("[getOrCreateProfile Fetch Error]:", fetchError);
  }

  if (existingProfile) {
    return { profile: existingProfile as Profile, error: null };
  }

  // 2. Extract fallback username & avatar from Supabase Auth user metadata
  const defaultUsername =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.name ||
    (user.email ? user.email.split("@")[0] : `user_${user.id.slice(0, 6)}`);

  const defaultAvatarUrl = user.user_metadata?.avatar_url || null;

  const newProfile = {
    id: user.id,
    username: defaultUsername,
    avatar_url: defaultAvatarUrl,
    updated_at: new Date().toISOString(),
  };

  // 3. Upsert into public.profiles
  const { data: createdProfile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(newProfile)
    .select("*")
    .single();

  if (upsertError) {
    console.error("[getOrCreateProfile Upsert Error]:", upsertError);
    return { profile: null, error: upsertError.message };
  }

  return { profile: createdProfile as Profile, error: null };
}

/**
 * Updates username & avatar_url in public.profiles table.
 */
export async function updateProfile(data: {
  username?: string;
  avatar_url?: string;
}): Promise<{ success: boolean; profile?: Profile; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const updates = {
    id: user.id,
    username: data.username !== undefined ? data.username.trim() : undefined,
    avatar_url: data.avatar_url !== undefined ? data.avatar_url.trim() : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .upsert(updates)
    .select("*")
    .single();

  if (error) {
    console.error("[updateProfile Error]:", error);
    return { success: false, error: error.message };
  }

  return { success: true, profile: updatedProfile as Profile, error: null };
}
