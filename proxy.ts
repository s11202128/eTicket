import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database, OrganizerStatus, UserRole } from "@/lib/database.types";
import { managerAreaRedirect, type Access } from "@/lib/access";

// Server-side route guard.
// - Signed out on any guarded page -> /login?next=<path> (mode=manager for /manager)
// - /admin/*   admins only, everyone else -> /?notice=not-authorized
// - /manager/* approved organizers; /manager/check-in also for door staff and
//   admins; everyone else -> /manager/application (their application status)
// - /tickets, /profile: any signed-in user
// The database (RLS + functions) still enforces the same rules on every query.
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
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isManagerArea = pathname === "/manager" || pathname.startsWith("/manager/");

  if (!data.user) {
    const mode = isManagerArea ? "&mode=manager" : "";
    return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}${mode}`);
  }

  if (!isAdminArea && !isManagerArea) return response;

  const { data: rows } = await supabase.rpc("get_my_access");
  const row = rows?.[0];
  const access: Access = {
    role: (row?.role as UserRole | undefined) ?? "attendee",
    organizerStatus: (row?.organizer_status as OrganizerStatus | null | undefined) ?? null,
    staffEventCount: row?.staff_event_count ?? 0,
  };

  if (isAdminArea) {
    return access.role === "admin" ? response : redirectTo("/?notice=not-authorized");
  }

  const destination = managerAreaRedirect(access, pathname);
  return destination ? redirectTo(destination) : response;
}

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/tickets/:path*", "/profile/:path*"],
};
