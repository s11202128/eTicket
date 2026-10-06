import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, UserRole } from "@/lib/database.types";

// Supabase client for Server Components and Route Handlers, using the
// signed-in user's cookies. Uses only the public key: every query still
// goes through row-level security as that user.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components can't set cookies; the proxy refreshes them.
          }
        },
      },
    }
  );
}

export type ViewerProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
};

// The verified signed-in user and their profile, or null.
export async function getViewer(): Promise<ViewerProfile | null> {
  const supabase = await createSupabaseServerClient();
  // getUser() validates the token with Supabase rather than trusting the cookie.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    role: profile.role as UserRole,
  };
}
