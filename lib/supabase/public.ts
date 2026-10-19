import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Supabase client for public, cacheable server reads (event pages, home,
// site content). It never reads cookies, so it always runs as the anonymous
// visitor: row-level security returns the same data for everyone, which is
// what lets those pages be cached and shared between visitors.
// For anything about the signed-in user, use createSupabaseServerClient().
export function createSupabasePublicClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
