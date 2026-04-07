import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type ForgotPasswordViewProps = {
  email: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function ForgotPasswordView({
  email,
  isSubmitting,
  error,
  successMessage,
  isFormValid,
  onEmailChange,
  onSubmit,
}: ForgotPasswordViewProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.left}>
          <h1 className={styles.title}>Reset Password</h1>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <input
              className={styles.input}
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="Email"
              autoComplete="email"
            />

            <button className={styles.primaryButton} type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "SENDING..." : "SEND RESET LINK"}
            </button>
          </form>

          {error ? <p className={styles.error}>{error}</p> : null}
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        </div>

        <aside className={styles.right}>
          <p className={styles.panelText}>Remembered your password? Go back and sign in.</p>
          <Link className={styles.outlineButton} href="/login">
            SIGN IN
          </Link>
        </aside>
      </section>
    </main>
  );
}
