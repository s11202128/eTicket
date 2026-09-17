"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "@/features/auth/model/auth.repository";
import { isDemoMode } from "@/lib/supabase";
import { getPasswordError, isValidEmail } from "@/features/auth/model/auth.validation";
import type { SignupCredentials } from "@/features/auth/model/auth.types";

type SignupViewModel = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useSignupViewModel(): SignupViewModel {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilledEmail = params.get("email")?.trim() ?? "";
    if (prefilledEmail && !email) {
      setEmail(prefilledEmail);
      setError("Email is not verified yet. Please complete signup verification.");
    }
  }, [email]);

  const onSubmit = async () => {
    if (isSubmitting) return;
    if (fullName.trim().length < 2) {
      setError("Enter your full name (at least 2 characters).");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!confirmPassword) {
      setError("Confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const credentials: SignupCredentials = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      };

      const result = await signUpWithEmail(credentials);

      if (!result.ok) {
        setError(result.errorMessage ?? "Signup failed. Please try again.");
        return;
      }

      if (result.requiresEmailVerification) {
        setSuccessMessage(
          "Account created. Check your email to verify your account before signing in."
        );
        return;
      }

      if (isDemoMode) {
        router.push("/dashboard");
        return;
      }

      setSuccessMessage("Account created successfully. You can sign in now.");
    } catch {
      setError("Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    fullName,
    email,
    password,
    confirmPassword,
    isSubmitting,
    error,
    successMessage,
    onFullNameChange: setFullName,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onConfirmPasswordChange: setConfirmPassword,
    onSubmit,
  };
}
