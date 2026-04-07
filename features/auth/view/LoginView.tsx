type LoginViewProps = {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function LoginView({
  email,
  password,
  isSubmitting,
  error,
  isFormValid,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginViewProps) {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "420px" }}>
      <h1>Login</h1>
      <p>Use your Supabase account to sign in.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
        style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}
      >
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete="current-password"
        />

        <button type="submit" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? <p style={{ color: "crimson", marginTop: "0.75rem" }}>{error}</p> : null}
    </main>
  );
}
