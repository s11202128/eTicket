import {
  getSupabaseClient,
  getSupabaseConfigurationError,
  isDemoMode,
} from "@/lib/supabase";
import type {
  AuthResult,
  LoginCredentials,
  SignupResult,
  SignupCredentials,
} from "@/features/auth/model/auth.types";

export async function signInWithEmail(
  credentials: LoginCredentials
): Promise<AuthResult> {
  if (isDemoMode) {
    localStorage.setItem("eticket-demo-session", "active");
    localStorage.setItem("eticket-demo-email", credentials.email);
    return { ok: true };
  }

  const client = getSupabaseClient();
  if (!client) return { ok: false, errorMessage: getSupabaseConfigurationError() };

  const { error } = await client.auth.signInWithPassword({
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
): Promise<SignupResult> {
  if (isDemoMode) {
    localStorage.setItem("eticket-demo-session", "active");
    localStorage.setItem("eticket-demo-email", credentials.email);
    localStorage.setItem("eticket-demo-name", credentials.fullName);
    return { ok: true, requiresEmailVerification: false };
  }

  const client = getSupabaseClient();
  if (!client) return { ok: false, errorMessage: getSupabaseConfigurationError() };

  const { data, error } = await client.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: { full_name: credentials.fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return {
    ok: true,
    requiresEmailVerification: !data.session,
  };
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string
): Promise<AuthResult> {
  if (isDemoMode) return { ok: true };

  const client = getSupabaseClient();
  if (!client) return { ok: false, errorMessage: getSupabaseConfigurationError() };

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (isDemoMode) return { ok: true };

  const client = getSupabaseClient();
  if (!client) return { ok: false, errorMessage: getSupabaseConfigurationError() };

  const { error } = await client.auth.updateUser({ password });
  return error ? { ok: false, errorMessage: error.message } : { ok: true };
}
