"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "@/features/auth/model/auth.repository";
import type { SignupCredentials } from "@/features/auth/model/auth.types";

type SignupViewModel = {
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useSignupViewModel(): SignupViewModel {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.trim().length >= 6 &&
      confirmPassword.trim().length > 0
    );
  }, [email, password, confirmPassword]);

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const credentials: SignupCredentials = {
        email: email.trim(),
        password,
      };

      const result = await signUpWithEmail(credentials);

      if (!result.ok) {
        setError(result.errorMessage ?? "Signup failed. Please try again.");
        return;
      }

      setSuccessMessage("Account created. Check your email to verify your account.");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    confirmPassword,
    isSubmitting,
    error,
    successMessage,
    isFormValid,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onConfirmPasswordChange: setConfirmPassword,
    onSubmit,
  };
}
