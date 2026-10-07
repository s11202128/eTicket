"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signOut } from "@/features/auth/model/auth.repository";
import { getMyAccess } from "@/features/auth/model/session.repository";

// Admin-only sign-in. Accounts that aren't authorized admins are signed
// straight back out (the database decides who is an admin).
export function useAdminLogin(next: string | null) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (isSubmitting || !email.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signInWithEmail({ email: email.trim(), password });
      if (!result.ok) {
        setError(
          result.errorMessage?.toLowerCase() === "invalid login credentials"
            ? "Wrong email or password."
            : (result.errorMessage ?? "Login failed. Please try again.")
        );
        return;
      }

      const access = await getMyAccess();
      if (access?.role !== "admin") {
        await signOut();
        setPassword("");
        setError("This account doesn't have admin access.");
        return;
      }

      router.push(next?.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Login failed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { email, setEmail, password, setPassword, isSubmitting, error, onSubmit };
}
