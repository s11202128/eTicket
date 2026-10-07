import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { FormMessage } from "@/features/auth/view/AuthPanel";
import { AuthHeading, AuthSplitLayout } from "@/features/auth/view/AuthSplitLayout";
import { OrganizerProfileForm } from "@/features/organizer/view/OrganizerProfileForm";
import type { SignupType, SignupViewModel } from "@/features/auth/viewmodel/useSignupViewModel";

const CARDS: { type: SignupType; title: string; body: string; icon: string }[] = [
  {
    type: "attendee",
    title: "Book tickets",
    body: "Find events, book in seconds and keep every ticket on your phone.",
    icon: "🎟️",
  },
  {
    type: "organizer",
    title: "Host events",
    body: "Sell tickets for your events, follow sales and check guests in. Reviewed by our team.",
    icon: "🎤",
  },
];

export function SignupView(vm: SignupViewModel) {
  const audience = vm.type === "organizer" ? "manager" : "book";

  return (
    <AuthSplitLayout audience={audience}>
      {vm.successMessage ? (
        <>
          <AuthHeading title="Check your email" />
          <FormMessage tone="success">{vm.successMessage}</FormMessage>
        </>
      ) : vm.step === "choose" ? (
        <ChooseType vm={vm} />
      ) : (
        <SignupForm vm={vm} />
      )}

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={vm.loginHref} className="font-semibold text-accent-text hover:underline">
          Log in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

function ChooseType({ vm }: { vm: SignupViewModel }) {
  return (
    <>
      <AuthHeading title="Create your account" subtitle="What would you like to do?" />
      <div className="grid gap-4">
        {CARDS.map((card) => (
          <button
            key={card.type}
            type="button"
            onClick={() => vm.onChooseType(card.type)}
            className={cn(
              "group grid grid-cols-[auto_1fr] items-start gap-4 rounded-xl border-2 bg-surface p-6 text-left transition-colors hover:border-accent",
              vm.type === card.type ? "border-accent" : "border-border"
            )}
          >
            <span aria-hidden className="grid size-12 place-items-center rounded-lg bg-surface-2 text-2xl">
              {card.icon}
            </span>
            <span className="grid gap-1">
              <span className="text-lg font-bold">{card.title}</span>
              <span className="text-sm text-muted">{card.body}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function SignupForm({ vm }: { vm: SignupViewModel }) {
  const isOrganizer = vm.type === "organizer";
  const isProfileStep = vm.step === "organization";

  const title = isOrganizer ? (isProfileStep ? "About your organization" : "Host events") : "Create your account";
  const subtitle = isOrganizer
    ? isProfileStep
      ? "Step 2 of 2. Our team reviews every organizer before their first event goes live."
      : "Step 1 of 2. Your login details."
    : "Book tickets in seconds and keep them all in one place.";
  const submitLabel = isOrganizer ? (isProfileStep ? "Submit application" : "Continue") : "Create account";

  return (
    <>
      <button type="button" onClick={vm.onBack} className="justify-self-start text-sm font-semibold text-muted hover:text-fg">
        ← Back
      </button>
      <AuthHeading title={title} subtitle={subtitle} />
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void vm.onSubmit();
          }}
        >
          {isProfileStep ? (
            <OrganizerProfileForm form={vm.organizerForm} disabled={vm.isSubmitting} />
          ) : (
            <AccountFields vm={vm} />
          )}
          {vm.error ? <FormMessage tone="error">{vm.error}</FormMessage> : null}
          <Button type="submit" size="lg" isLoading={vm.isSubmitting}>
            {submitLabel}
          </Button>
        </form>
      </div>
    </>
  );
}

function AccountFields({ vm }: { vm: SignupViewModel }) {
  return (
    <>
      <Field label="Full name" error={vm.accountErrors.fullName}>
        {(props) => (
          <Input {...props} autoComplete="name" value={vm.fullName} onChange={(event) => vm.onFullNameChange(event.target.value)} />
        )}
      </Field>
      <Field label="Email" error={vm.accountErrors.email}>
        {(props) => (
          <Input {...props} type="email" autoComplete="email" value={vm.email} onChange={(event) => vm.onEmailChange(event.target.value)} />
        )}
      </Field>
      <Field label="Password" hint="At least 6 characters." error={vm.accountErrors.password}>
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            value={vm.password}
            onChange={(event) => vm.onPasswordChange(event.target.value)}
          />
        )}
      </Field>
      <Field label="Confirm password" error={vm.accountErrors.confirmPassword}>
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            value={vm.confirmPassword}
            onChange={(event) => vm.onConfirmPasswordChange(event.target.value)}
          />
        )}
      </Field>
    </>
  );
}
