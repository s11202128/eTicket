import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type ForgotPasswordViewProps = {
  email: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onEmailChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function ForgotPasswordView({
  email,
  isSubmitting,
  error,
  successMessage,
  onEmailChange,
  onSubmit,
}: ForgotPasswordViewProps) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.logo}>eTicket<span>.</span></Link>
      <section className={styles.card}>
        <div className={styles.left}>
          <span className={styles.eyebrow}>ACCOUNT ACCESS</span>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.intro}>We&apos;ll send a secure reset link to your inbox.</p>

          <form
            className={styles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <label className={styles.srOnly} htmlFor="reset-email">Email</label>
            <input
              className={styles.input}
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
            />

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "SENDING..." : "SEND RESET LINK"}
            </button>
          </form>

          {error ? <p className={styles.error} role="alert" aria-live="polite">{error}</p> : null}
          {successMessage ? <p className={styles.success} role="status">{successMessage}</p> : null}
        </div>

        <aside className={styles.right}>
          <span className={styles.eyebrowLight}>ALL GOOD?</span>
          <h2>Back to the fun part.</h2>
          <p className={styles.panelText}>Return to sign in and open your member space.</p>
          <Link className={styles.outlineButton} href="/login">
            SIGN IN
          </Link>
        </aside>
      </section>
    </main>
  );
}
