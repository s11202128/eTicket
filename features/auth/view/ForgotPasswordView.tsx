import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthPanel, FormMessage } from "@/features/auth/view/AuthPanel";

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
    <AuthPanel
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-accent-text hover:underline">
          Back to log in
        </Link>
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
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!isFormValid}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthPanel>
  );
}
