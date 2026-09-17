import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type Props = ReturnType<typeof import("@/features/auth/viewmodel/useUpdatePasswordViewModel").useUpdatePasswordViewModel>;

export function UpdatePasswordView(props: Props) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.logo}>eTicket<span>.</span></Link>
      <section className={styles.card}>
        <div className={styles.left}>
          <span className={styles.eyebrow}>SECURE YOUR ACCOUNT</span>
          <h1 className={styles.title}>Choose a password</h1>
          <p className={styles.intro}>Use at least six characters for your new password.</p>
          <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void props.onSubmit(); }}>
            <label className={styles.srOnly} htmlFor="new-password">New password</label>
            <input id="new-password" className={styles.input} type="password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} placeholder="New password" autoComplete="new-password" minLength={6} required />
            <label className={styles.srOnly} htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" className={styles.input} type="password" value={props.confirmPassword} onChange={(event) => props.onConfirmPasswordChange(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" minLength={6} required />
            <button className={styles.primaryButton} type="submit" disabled={!props.isFormValid || props.isSubmitting}>{props.isSubmitting ? "UPDATING…" : "UPDATE PASSWORD"}</button>
          </form>
          {props.error ? <p className={styles.error}>{props.error}</p> : null}
          {props.successMessage ? <p className={styles.success}>{props.successMessage} <Link href="/login">Sign in</Link></p> : null}
        </div>
        <aside className={styles.right}>
          <span className={styles.eyebrowLight}>ALMOST THERE</span><h2>Back to your plans.</h2><p className={styles.panelText}>One quick update, then every ticket is yours again.</p>
        </aside>
      </section>
    </main>
  );
}
