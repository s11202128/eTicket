import { getSupabaseClient, isDemoMode } from "@/lib/supabase";

export type AuthUserProfile = {
  displayName: string;
  avatarUrl: string | null;
};

export async function hasActiveSession(): Promise<boolean> {
  if (isDemoMode) return localStorage.getItem("eticket-demo-session") === "active";

  const client = getSupabaseClient();
  if (!client) return false;
  const { data, error } = await client.auth.getSession();

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
  if (isDemoMode) {
    return {
      displayName: localStorage.getItem("eticket-demo-name") || "Alex Morgan",
      avatarUrl: null,
    };
  }

  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await client
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

export async function getAccessToken(): Promise<string | null> {
  if (isDemoMode) {
    return localStorage.getItem("eticket-demo-session") === "active"
      ? "demo-session"
      : null;
  }

  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  return error ? null : data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  if (isDemoMode) {
    localStorage.removeItem("eticket-demo-session");
    return;
  }

  await getSupabaseClient()?.auth.signOut();
}
