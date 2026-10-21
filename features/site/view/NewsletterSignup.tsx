"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useNewsletterSignup } from "@/features/site/viewmodel/useNewsletterSignup";

// "Stay in the loop" box on the home page.
export function NewsletterSignup() {
  const vm = useNewsletterSignup();

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="grid gap-5 rounded-lg border border-border bg-surface p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center"
    >
      <div className="grid gap-2">
        <h2 id="newsletter-heading" className="text-2xl font-extrabold tracking-tight">
          Stay in the loop
        </h2>
        <p className="text-muted">
          New events and tickets going on sale, straight to your inbox. No spam, and you can ask us to remove you at
          any time.
        </p>
      </div>

      <form onSubmit={(event) => void vm.submit(event)} noValidate className="grid gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="newsletter-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            value={vm.email}
            onChange={(event) => vm.setEmail(event.target.value)}
            aria-invalid={vm.error ? true : undefined}
            aria-describedby={vm.error ? "newsletter-error" : undefined}
            disabled={vm.isSubmitting}
          />
          <Button type="submit" isLoading={vm.isSubmitting} className="sm:shrink-0">
            Subscribe
          </Button>
        </div>
        {vm.error ? (
          <p id="newsletter-error" role="alert" className="text-xs font-medium text-danger">
            {vm.error}
          </p>
        ) : vm.isDone ? (
          <p role="status" className="text-xs font-medium text-success">
            Thanks, you&apos;re subscribed.
          </p>
        ) : null}
      </form>
    </section>
  );
}
