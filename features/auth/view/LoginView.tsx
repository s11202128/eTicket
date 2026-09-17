import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";
import { isDemoMode } from "@/lib/supabase";

type LoginViewProps = {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function LoginView({
  email,
  password,
  isSubmitting,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginViewProps) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.logo}>eTicket<span>.</span></Link>
      <section className={styles.card}>
        <div className={styles.left}>
          <span className={styles.eyebrow}>WELCOME BACK</span>
          <h1 className={styles.title}>Welcome</h1>
          <p className={styles.intro}>Sign in to access your tickets and discover what&apos;s next.</p>

          <form
            className={styles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <label className={styles.srOnly} htmlFor="email">Email</label>
            <input
              className={styles.input}
              id="email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
            />

            <label className={styles.srOnly} htmlFor="password">Password</label>
            <input
              className={styles.input}
              id="password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />

            <Link className={styles.forgot} href="/forgot-password">
              Forgot password?
            </Link>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          {error ? <p className={styles.error} role="alert" aria-live="polite">{error}</p> : null}
          {isDemoMode ? <p className={styles.demoNote}>Preview mode: use any email and password to enter.</p> : null}
        </div>

        <aside className={styles.right}>
          <span className={styles.eyebrowLight}>NEW HERE?</span>
          <h2>Make tonight count.</h2>
          <p className={styles.panelText}>Create an account to book and manage every experience.</p>
          <Link className={styles.outlineButton} href="/signup">
            SIGN UP
          </Link>
        </aside>
      </section>
    </main>
  );
}
