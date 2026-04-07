import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type SignupViewProps = {
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function SignupView({
  email,
  password,
  confirmPassword,
  isSubmitting,
  error,
  successMessage,
  isFormValid,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: SignupViewProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.left}>
          <h1 className={styles.title}>Create Account</h1>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <input
              className={styles.input}
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="Email"
              autoComplete="email"
            />
            <input
              className={styles.input}
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Password"
              autoComplete="new-password"
            />
            <input
              className={styles.input}
              id="signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder="Confirm Password"
              autoComplete="new-password"
            />
            <button className={styles.primaryButton} type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "CREATING..." : "SIGN UP"}
            </button>
          </form>

          {error ? <p className={styles.error}>{error}</p> : null}
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        </div>

        <aside className={styles.right}>
          <p className={styles.panelText}>Already have an account? Please Sign in!</p>
          <Link className={styles.outlineButton} href="/login">
            SIGN IN
          </Link>
        </aside>
      </section>
    </main>
  );
}
