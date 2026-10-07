// The admin dashboard has its own login session, stored in its own cookie,
// so signing in or out on the public site never affects it (and the other
// way round). Everything under /admin uses the admin session.

export type SessionArea = "public" | "admin";

export const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

export function authCookieName(area: SessionArea): string {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  // The public name is Supabase's default, so existing logins keep working.
  return area === "admin" ? `sb-${ref}-admin-auth-token` : `sb-${ref}-auth-token`;
}
