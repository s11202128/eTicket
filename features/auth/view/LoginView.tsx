import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthPanel, FormMessage } from "@/features/auth/view/AuthPanel";

type LoginViewProps = {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  signupHref: string;
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
  signupHref,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginViewProps) {
  return (
    <AuthPanel
      title="Welcome back"
      subtitle="Log in to book events and see your tickets."
      footer={
        <>
          New here?{" "}
          <Link href={signupHref} className="font-semibold text-accent-text hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Field label="Email">
          {(props) => (
            <Input {...props} type="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
          )}
        </Field>
        <Field label="Password">
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          )}
        </Field>
        <Link href="/forgot-password" className="justify-self-end text-sm font-semibold text-accent-text hover:underline">
          Forgot password?
        </Link>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!isFormValid}>
          Log in
        </Button>
      </form>
    </AuthPanel>
  );
}
