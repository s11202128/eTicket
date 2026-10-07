"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/features/auth/model/auth.repository";
import { hasActiveSession } from "@/features/auth/model/session.repository";

type ResetPasswordViewModel = {
  isCheckingLink: boolean;
  hasValidLink: boolean;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useResetPasswordViewModel(): ResetPasswordViewModel {
  const router = useRouter();
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [hasValidLink, setHasValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // The reset email link signs the user in temporarily; Supabase reads the
  // token from the URL when the client starts, so a session means it worked.
  useEffect(() => {
    let isMounted = true;

    hasActiveSession().then((isValid) => {
      if (!isMounted) return;
      setHasValidLink(isValid);
      setIsCheckingLink(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const isFormValid = useMemo(() => {
    return password.trim().length >= 6 && confirmPassword.trim().length > 0;
  }, [password, confirmPassword]);

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.errorMessage ?? "Could not update your password.");
        return;
      }

      setSuccessMessage("Password updated. Taking you to your tickets…");
      router.push("/tickets");
      router.refresh();
    } catch {
      setError("Could not update your password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isCheckingLink,
    hasValidLink,
    password,
    confirmPassword,
    isSubmitting,
    error,
    successMessage,
    isFormValid,
    onPasswordChange: setPassword,
    onConfirmPasswordChange: setConfirmPassword,
    onSubmit,
  };
}
