import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { AuthPanel, FormMessage } from "@/features/auth/view/AuthPanel";

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
    <AuthPanel title="Choose a new password">
      {isCheckingLink ? (
        <div role="status" aria-label="Checking your reset link" className="grid gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : !hasValidLink ? (
        <FormMessage tone="error">
          This reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </FormMessage>
      ) : successMessage ? (
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
          <Field label="New password" hint="At least 6 characters.">
            {(props) => (
              <Input {...props} type="password" autoComplete="new-password" value={password} onChange={(event) => onPasswordChange(event.target.value)} />
            )}
          </Field>
          <Field label="Confirm new password">
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
            Update password
          </Button>
        </form>
      )}
    </AuthPanel>
  );
}
