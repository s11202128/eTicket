import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type ResetPasswordViewProps = {
  isCheckingLink: boolean;
  hasValidLink: boolean;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function ResetPasswordView({
  isCheckingLink,
  hasValidLink,
  password,
  confirmPassword,
  isSubmitting,
  error,
  successMessage,
  isFormValid,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: ResetPasswordViewProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.left}>
          <h1 className={styles.title}>Set New Password</h1>

          {isCheckingLink ? <p>Checking your reset link...</p> : null}

          {!isCheckingLink && !hasValidLink ? (
            <p className={styles.error}>
              This reset link is invalid or has expired. Request a new one from{" "}
              <Link href="/forgot-password">Forgot password</Link>.
            </p>
          ) : null}

          {!isCheckingLink && hasValidLink ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <input
                className={styles.input}
                id="reset-new-password"
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="New password (min 6 characters)"
                autoComplete="new-password"
              />
              <input
                className={styles.input}
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />

              <button className={styles.primaryButton} type="submit" disabled={!isFormValid || isSubmitting}>
                {isSubmitting ? "SAVING..." : "UPDATE PASSWORD"}
              </button>
            </form>
          ) : null}

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
