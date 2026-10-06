"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/features/auth/model/auth.repository";
import type { LoginCredentials } from "@/features/auth/model/auth.types";
import { safeNextPath } from "@/lib/safeRedirect";

type LoginViewModel = {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  signupHref: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useLoginViewModel(): LoginViewModel {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep ?next= when switching to signup so the user returns to the same page.
  const [signupHref, setSignupHref] = useState("/signup");
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) setSignupHref(`/signup?next=${encodeURIComponent(safeNextPath(next))}`);
  }, []);

  const isFormValid = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

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
          setError("Email is not verified. Please go to signup and verify first.");
          router.push(`/signup?email=${encodeURIComponent(email.trim())}`);
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

      // Return to the page that asked for sign-in (e.g. an admin page).
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(safeNextPath(next, "/"));
      // Re-render server parts (header) with the new session.
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    isSubmitting,
    error,
    isFormValid,
    signupHref,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit,
  };
}
