"use server";

import { revalidatePath } from "next/cache";
import { createRepository, deleteRepository } from "@/lib/repositories";
import { CreateRepositoryInput } from "@/types";

/**
 * Server Action: Add a new repository to the database for the authenticated user.
 */
export async function addRepositoryAction(formData: FormData) {
  const name = (formData.get("name") as string) || "";
  const owner = (formData.get("owner") as string) || "";
  const description = (formData.get("description") as string) || "";
  const language = (formData.get("language") as string) || "TypeScript";

  if (!name.trim() || !owner.trim()) {
    return { error: "Repository name and owner are required." };
  }

  const input: CreateRepositoryInput = {
    name: name.trim(),
    full_name: `${owner.trim()}/${name.trim()}`,
    owner: owner.trim(),
    description: description.trim() || null,
    language: language.trim() || "TypeScript",
    stars: 0,
    forks: 0,
    default_branch: "main",
    url: `https://github.com/${owner.trim()}/${name.trim()}`,
  };

  const { repository, error } = await createRepository(input);

  if (error) {
    return { error };
  }

  revalidatePath("/repositories");
  revalidatePath("/dashboard");
  return { repository, error: null };
}

/**
 * Server Action: Delete a repository by ID.
 */
export async function deleteRepositoryAction(id: string) {
  const { success, error } = await deleteRepository(id);
  if (success) {
    revalidatePath("/repositories");
    revalidatePath("/dashboard");
  }
  return { success, error };
}
