import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type SignupViewProps = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function SignupView({
  fullName,
  email,
  password,
  confirmPassword,
  isSubmitting,
  error,
  successMessage,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: SignupViewProps) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.logo}>eTicket<span>.</span></Link>
      <section className={styles.card}>
        <div className={styles.left}>
          <span className={styles.eyebrow}>JOIN ETICKET</span>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.intro}>Your next favorite night is only a few details away.</p>
          <form
            className={styles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <label className={styles.srOnly} htmlFor="signup-name">Full name</label>
            <input
              className={styles.input}
              id="signup-name"
              type="text"
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
              placeholder="Full name"
              autoComplete="name"
              required
            />
            <label className={styles.srOnly} htmlFor="signup-email">Email</label>
            <input
              className={styles.input}
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
            />
            <label className={styles.srOnly} htmlFor="signup-password">Password</label>
            <input
              className={styles.input}
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <label className={styles.srOnly} htmlFor="signup-confirm-password">Confirm password</label>
            <input
              className={styles.input}
              id="signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder="Confirm Password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "CREATING..." : "SIGN UP"}
            </button>
          </form>

          {error ? <p className={styles.error} role="alert" aria-live="polite">{error}</p> : null}
          {successMessage ? <p className={styles.success} role="status">{successMessage}</p> : null}
        </div>

        <aside className={styles.right}>
          <span className={styles.eyebrowLight}>ALREADY A MEMBER?</span>
          <h2>Welcome back.</h2>
          <p className={styles.panelText}>Your tickets are waiting exactly where you left them.</p>
          <Link className={styles.outlineButton} href="/login">
            SIGN IN
          </Link>
        </aside>
      </section>
    </main>
  );
}
