import { supabase } from "@/lib/supabase";

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

  const metadata = data.user.user_metadata ?? {};
  const rawName =
    metadata.full_name ??
    metadata.name ??
    (data.user.email ? data.user.email.split("@")[0] : "User");

  const displayName = normalizeDisplayName(String(rawName || "User"));
  const avatarUrl = metadata.avatar_url ? String(metadata.avatar_url) : null;

  return {
    displayName,
    avatarUrl,
  };
}
