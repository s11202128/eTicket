"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAdminWithEmail } from "@/features/auth/model/auth.repository";
import { isValidEmail } from "@/features/auth/model/auth.validation";
import { hasActiveSession, signOut } from "@/features/auth/model/session.repository";
import { verifyAdminAccess } from "@/features/admin/model/admin.repository";
import { isDemoMode } from "@/lib/supabase";
import styles from "./AdminLogin.module.css";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (await hasActiveSession() && await verifyAdminAccess()) {
        router.replace("/admin");
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  const submit = async () => {
    if (submitting) return;
    if (!isValidEmail(email)) {
      setError("Enter a valid administrator email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await signInAdminWithEmail({ email: email.trim(), password });
      if (!result.ok) {
        setError(result.errorMessage || "Administrator sign in failed.");
        return;
      }
      if (!await verifyAdminAccess()) {
        await signOut();
        setError("This account does not have administrator access.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      await signOut();
      setError("Administrator sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return <main className={styles.loading}><span /><p>Verifying access layer…</p></main>;

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}>eTicket<span>.</span></Link>
      <section className={styles.accessCard}>
        <div className={styles.signal} aria-hidden="true"><div><span>ADMIN</span><i /></div><strong>01</strong><small>SECURE ACCESS NODE</small></div>
        <div className={styles.formPanel}>
          <span className={styles.eyebrow}>SYSTEM MANAGER / RESTRICTED</span>
          <h1>Admin<br/><em>sign in.</em></h1>
          <p>Only authorised platform administrators can enter the event management command centre.</p>
          <form noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <label htmlFor="admin-email"><span>ADMIN EMAIL</span><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@eticket.sb" required /></label>
            <label htmlFor="admin-password"><span>PASSWORD</span><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
            <div className={styles.formMeta}><Link href="/forgot-password">Forgot password?</Link><span><i /> Encrypted connection</span></div>
            <button type="submit" disabled={submitting}>{submitting ? "VERIFYING ACCESS…" : "ENTER COMMAND CENTRE"}<b aria-hidden="true">↗</b></button>
          </form>
          {error ? <div className={styles.error} role="alert"><span>!</span><p>{error}</p></div> : null}
          {isDemoMode ? <div className={styles.demo}><span>PREVIEW CREDENTIAL</span><strong>admin@eticket.sb</strong><small>Use any non-empty password.</small></div> : null}
          <footer><Link href="/login">← Customer sign in</Link><small>Access is verified against your database role.</small></footer>
        </div>
      </section>
    </main>
  );
}
