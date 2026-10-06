import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthPanel, FormMessage } from "@/features/auth/view/AuthPanel";

type SignupViewProps = {
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isFormValid: boolean;
  loginHref: string;
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
  loginHref,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: SignupViewProps) {
  return (
    <AuthPanel
      title="Create your account"
      subtitle="Book tickets in seconds and keep them all in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-accent-text hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {successMessage ? (
        <FormMessage tone="success">{successMessage}</FormMessage>
      ) : (
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
          <Field label="Password" hint="At least 6 characters.">
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
            )}
          </Field>
          <Field label="Confirm password">
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
              />
            )}
          </Field>
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!isFormValid}>
            Sign up
          </Button>
        </form>
      )}
    </AuthPanel>
  );
}
