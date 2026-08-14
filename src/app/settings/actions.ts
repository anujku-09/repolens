"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/profiles";

/**
 * Server Action: Update user profile username & avatar_url in public.profiles.
 */
export async function updateProfileAction(formData: FormData) {
  const username = formData.get("username") as string;
  const avatar_url = formData.get("avatar_url") as string;

  const result = await updateProfile({
    username,
    avatar_url,
  });

  if (result.success) {
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/repositories");
  }

  return result;
}
