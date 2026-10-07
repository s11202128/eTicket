import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, OrganizerStatus, UserRole } from "@/lib/database.types";
import { authCookieName, type SessionArea } from "@/lib/authCookies";

// Supabase client for Server Components and Route Handlers, using the
// signed-in user's cookies. Uses only the public key: every query still
// goes through row-level security as that user. The admin area passes
// "admin" to use its separate session.
export async function createSupabaseServerClient(area: SessionArea = "public") {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: authCookieName(area) },
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
  organizerStatus: OrganizerStatus | null;
  // Door staff on at least one event (can use the check-in scanner).
  isStaff: boolean;
};

// The verified signed-in user and their profile, or null.
export async function getViewer(area: SessionArea = "public"): Promise<ViewerProfile | null> {
  const supabase = await createSupabaseServerClient(area);
  // getUser() validates the token with Supabase rather than trusting the cookie.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const [{ data: profile }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, role").eq("id", data.user.id).maybeSingle(),
    supabase.rpc("get_my_access"),
  ]);

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    // Effective role: 'admin' only for authorized admin emails.
    role: ((access?.[0]?.role ?? profile.role) as UserRole),
    organizerStatus: (access?.[0]?.organizer_status as OrganizerStatus | null | undefined) ?? null,
    isStaff: (access?.[0]?.staff_event_count ?? 0) > 0,
  };
}
