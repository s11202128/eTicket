import { supabase } from "@/lib/supabase";
import type { LoginCredentials, LoginResult } from "@/features/auth/model/auth.types";

export async function signInWithEmail(
  credentials: LoginCredentials
): Promise<LoginResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true };
}
