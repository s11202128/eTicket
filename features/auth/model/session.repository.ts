import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/database.types";

export type AuthUserProfile = {
  displayName: string;
  avatarUrl: string | null;
};

export async function hasActiveSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return false;
  }

  return Boolean(data.session);
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return null;
  }

  return data.session.user.id;
}

function normalizeDisplayName(rawName: string): string {
  return rawName
    .trim()
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getCurrentUserProfile(): Promise<AuthUserProfile | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", data.user.id)
    .single();

  const metadata = data.user.user_metadata ?? {};
  const rawName =
    profile?.full_name ??
    metadata.full_name ??
    metadata.name ??
    (data.user.email ? data.user.email.split("@")[0] : "User");

  const displayName = normalizeDisplayName(String(rawName || "User"));
  const avatarUrl = profile?.avatar_url ?? (metadata.avatar_url ? String(metadata.avatar_url) : null);

  return {
    displayName,
    avatarUrl,
  };
}

// The signed-in user's role, or null when signed out. For showing or hiding
// links only; permissions are enforced by the database.
export async function getCurrentRole(): Promise<UserRole | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as UserRole | undefined) ?? null;
}
