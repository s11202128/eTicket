import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let browserClient: SupabaseClient | null = null;

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }

  return browserClient;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
