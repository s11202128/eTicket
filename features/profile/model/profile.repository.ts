import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type Profile = Pick<Tables<"profiles">, "id" | "email" | "full_name" | "avatar_url">;

export type ProfileUpdate = {
  fullName: string | null;
  avatarUrl: string | null;
};

export type ProfileResult = {
  ok: boolean;
  errorMessage?: string;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Only full_name and avatar_url are writable; the database blocks other columns.
export async function updateMyProfile(
  userId: string,
  update: ProfileUpdate
): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: update.fullName, avatar_url: update.avatarUrl })
    .eq("id", userId)
    .select("id");

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  if (data.length === 0) {
    return { ok: false, errorMessage: "Profile not found." };
  }

  return { ok: true };
}
