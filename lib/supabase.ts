import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

// Browser client. The session is stored in cookies so the server (proxy,
// admin layout, auth callback) can read the same login.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
