"use client";

import { useMemo, useState } from "react";
import { requestPasswordReset } from "@/features/auth/model/auth.repository";

type ForgotPasswordViewModel = {
  email: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useForgotPasswordViewModel(): ForgotPasswordViewModel {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFormValid = useMemo(() => email.trim().length > 0, [email]);

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

      const result = await requestPasswordReset(email.trim(), redirectTo);

      if (!result.ok) {
        setError(result.errorMessage ?? "Unable to send reset email.");
        return;
      }

      setSuccessMessage("Reset link sent. Check your inbox and spam folder.");
    } catch {
      setError("Unable to send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    isSubmitting,
    error,
    successMessage,
    isFormValid,
    onEmailChange: setEmail,
    onSubmit,
  };
}
