import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormMessage } from "@/features/auth/view/AuthPanel";
import { AudienceToggle, AuthHeading, AuthSplitLayout } from "@/features/auth/view/AuthSplitLayout";
import type { LoginViewModel } from "@/features/auth/viewmodel/useLoginViewModel";

const COPY = {
  book: {
    title: "Welcome back",
    subtitle: "Log in to book events and see your tickets.",
    signupPrompt: "New here?",
    signupLink: "Create an account",
  },
  manager: {
    title: "Manage your events",
    subtitle: "Log in to your Event Manager account to run events, sales and check-in.",
    signupPrompt: "Want to host events?",
    signupLink: "Apply as an organizer",
  },
};

export function LoginView({
  mode,
  email,
  password,
  isSubmitting,
  error,
  showApplyPrompt,
  isFormValid,
  signupHref,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginViewModel) {
  const copy = COPY[mode];

  return (
    <AuthSplitLayout audience={mode}>
      <AudienceToggle value={mode} onChange={onModeChange} />
      <AuthHeading title={copy.title} subtitle={copy.subtitle} />

      {showApplyPrompt ? (
        <div role="status" className="grid gap-3 rounded-xl border border-border bg-surface p-6">
          <p className="font-bold">You don&apos;t have an organizer account yet.</p>
          <p className="text-sm text-muted">
            You&apos;re signed in and can book tickets as usual. To host events, tell us a little about your
            organization and our team will review it.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/signup?type=organizer">Apply now</ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Continue to events
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
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
        </div>
      )}

      <p className="text-center text-sm text-muted">
        {copy.signupPrompt}{" "}
        <Link href={signupHref} className="font-semibold text-accent-text hover:underline">
          {copy.signupLink}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
