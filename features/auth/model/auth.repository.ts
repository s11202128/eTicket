import { supabase } from "@/lib/supabase";
import type {
  AuthResult,
  LoginCredentials,
  SignupResult,
  SignupCredentials,
  SignupOrganizerApplication,
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
  credentials: SignupCredentials,
  next = "/",
  organizerApplication?: SignupOrganizerApplication
): Promise<SignupResult> {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.fullName,
        ...(organizerApplication ? { organizer_application: organizerApplication } : {}),
      },
      // The confirmation link signs the user in through /auth/callback.
      emailRedirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
          : undefined,
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true };
}
