import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { authCookieName, isAdminPath } from "@/lib/authCookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

// Browser client. The session is stored in cookies so the server (proxy,
// layouts, auth callback) can read the same login. Pages under /admin use
// the separate admin session; moving between the admin area and the public
// site is always a full page load, so each page gets the right client.
const area = typeof window !== "undefined" && isAdminPath(window.location.pathname) ? "admin" : "public";

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  cookieOptions: { name: authCookieName(area) },
});
