"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/features/auth/model/auth.repository";
import { getMyAccess } from "@/features/auth/model/session.repository";
import type { LoginCredentials } from "@/features/auth/model/auth.types";
import { loginDestination, type LoginMode } from "@/lib/access";

export type LoginViewModel = {
  mode: LoginMode;
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  // Signed in with "Manage events" but has no organizer account yet.
  showApplyPrompt: boolean;
  isFormValid: boolean;
  signupHref: string;
  onModeChange: (mode: LoginMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

// `next` must already be a safe same-site path (see safeNextPath).
export function useLoginViewModel(initialMode: LoginMode, next: string | null): LoginViewModel {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);

  const isFormValid = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  const signupHref = useMemo(() => {
    const params = new URLSearchParams();
    if (mode === "manager") params.set("type", "organizer");
    // Keep ?next= so the user returns to the same page after signing up.
    if (next) params.set("next", next);
    const query = params.toString();
    return query ? `/signup?${query}` : "/signup";
  }, [mode, next]);

  const onModeChange = (value: LoginMode) => {
    setMode(value);
    setShowApplyPrompt(false);
    // Keep the choice in the address bar (shareable, survives reloads).
    const url = new URL(window.location.href);
    if (value === "manager") url.searchParams.set("mode", "manager");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  };

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setShowApplyPrompt(false);

    try {
      const credentials: LoginCredentials = {
        email: email.trim(),
        password,
      };

      const result = await signInWithEmail(credentials);

      if (!result.ok) {
        const rawMessage = result.errorMessage ?? "Login failed. Please try again.";
        const normalizedMessage = rawMessage.toLowerCase();
        const isUnverifiedEmail =
          normalizedMessage.includes("email not confirmed") ||
          normalizedMessage.includes("email not verified");

        if (isUnverifiedEmail) {
          setError("Your email isn't verified yet. Open the link we emailed you, then log in.");
          return;
        }

        const isGenericCredentialError =
          normalizedMessage === "invalid login credentials";

        setError(
          isGenericCredentialError
            ? "Invalid login credentials. If you just signed up, verify your email first."
            : rawMessage
        );
        return;
      }

      const access = (await getMyAccess()) ?? { role: "attendee" as const, organizerStatus: null, staffEventCount: 0 };
      const destination = loginDestination(access, mode, next);

      if (destination.kind === "apply_prompt") {
        setShowApplyPrompt(true);
        // Signed in now: refresh the header.
        router.refresh();
        return;
      }

      router.push(destination.href);
      // Re-render server parts (header) with the new session.
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    mode,
    email,
    password,
    isSubmitting,
    error,
    showApplyPrompt,
    isFormValid,
    signupHref,
    onModeChange,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit,
  };
}
