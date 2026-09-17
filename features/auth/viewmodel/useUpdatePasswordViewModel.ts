"use client";

import { useMemo, useState } from "react";
import { updatePassword } from "@/features/auth/model/auth.repository";

export function useUpdatePasswordViewModel() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isFormValid = useMemo(
    () => password.length >= 6 && confirmPassword.length >= 6,
    [password, confirmPassword],
  );

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await updatePassword(password);
    if (result.ok) setSuccessMessage("Password updated. You can sign in with it now.");
    else setError(result.errorMessage || "This reset link is invalid or has expired.");
    setIsSubmitting(false);
  };

  return {
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
