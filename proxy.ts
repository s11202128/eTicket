import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Server-side guard for the admin area.
// - Not signed in        -> /login?next=<requested path>
// - Signed in, wrong role -> /?notice=not-authorized
// /admin/check-in allows staff and admins; every other /admin page is admin-only.
// Row-level security still enforces the same rules on every query.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Keep refreshed auth cookies on redirects too.
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const { data } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!data.user) {
    return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = profile?.role;
  const isCheckIn = pathname === "/admin/check-in" || pathname.startsWith("/admin/check-in/");
  const allowed = role === "admin" || (isCheckIn && role === "staff");

  if (!allowed) {
    return redirectTo("/?notice=not-authorized");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
