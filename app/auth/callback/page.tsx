"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function completeSignIn() {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const authError = searchParams.get("error_description");
      const client = getSupabaseClient();

      if (authError) {
        if (isMounted) setError(authError.replace(/\+/g, " "));
        return;
      }

      if (!client) {
        if (isMounted) setError("Supabase is not configured.");
        return;
      }

      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (isMounted) setError(exchangeError.message);
          return;
        }
      } else {
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError || !data.session) {
          if (isMounted) setError(sessionError?.message ?? "The verification link is invalid or expired.");
          return;
        }
      }

      router.replace("/dashboard");
    }

    void completeSignIn();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <main style={{ padding: "3rem", fontFamily: "sans-serif" }}>
        <h1>Verification failed</h1>
        <p>{error}</p>
        <a href="/login">Return to sign in</a>
      </main>
    );
  }

  return (
    <main style={{ padding: "3rem", fontFamily: "sans-serif" }}>
      <p>Confirming your email...</p>
    </main>
  );
}