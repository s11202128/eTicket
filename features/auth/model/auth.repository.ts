import { supabase } from "@/lib/supabase";
import type {
  AuthResult,
  LoginCredentials,
  SignupCredentials,
} from "@/features/auth/model/auth.types";

export async function signInWithEmail(
  credentials: LoginCredentials
): Promise<AuthResult> {
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

export async function signUpWithEmail(
  credentials: SignupCredentials
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
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
