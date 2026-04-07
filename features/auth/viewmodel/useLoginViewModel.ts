"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/features/auth/model/auth.repository";
import type { LoginCredentials } from "@/features/auth/model/auth.types";

type LoginViewModel = {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
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
        setError(result.errorMessage ?? "Login failed. Please try again.");
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
    isFormValid,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit,
  };
}
