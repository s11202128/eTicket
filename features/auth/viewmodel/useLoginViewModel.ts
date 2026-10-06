"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/features/auth/model/auth.repository";
import { isValidEmail } from "@/features/auth/model/auth.validation";
import type { LoginCredentials } from "@/features/auth/model/auth.types";

type LoginViewModel = {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
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

  const onSubmit = async () => {
    if (isSubmitting) return;
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

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

      router.push("/dashboard");
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
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit,
  };
}
