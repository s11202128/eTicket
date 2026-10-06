"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/features/auth/model/auth.repository";
import styles from "@/features/auth/view/AuthCard.module.css";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    // Go to login whether or not sign-out succeeds; a failed call still
    // clears the local session.
    signOut().finally(() => {
      router.replace("/login");
    });
  }, [router]);

  return (
    <main className={styles.page}>
      <p>Signing you out...</p>
    </main>
  );
}
