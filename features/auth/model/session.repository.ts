import { supabase } from "@/lib/supabase";

export async function hasActiveSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return false;
  }

  return Boolean(data.session);
}
