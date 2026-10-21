"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { CONTACT_MESSAGE_MAX } from "@/features/site/model/contact.schema";
import { useContactForm } from "@/features/site/viewmodel/useContactForm";

// Message form on the Contact page. Works without signing in.
export function ContactForm() {
  const vm = useContactForm();

  if (vm.isSent) {
    return (
      <div role="status" className="grid justify-items-start gap-3 rounded-lg border border-success/40 bg-success-bg p-5">
        <p className="font-semibold text-success">Thanks, your message has been sent. We&apos;ll reply by email.</p>
        <Button variant="secondary" size="sm" onClick={vm.sendAnother}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void vm.submit(event)}
      noValidate
      aria-label="Contact form"
      className="relative grid gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={vm.errors.name}>
          {(props) => (
            <Input
              {...props}
              autoComplete="name"
              maxLength={100}
              value={vm.values.name}
              onChange={(event) => vm.setField("name", event.target.value)}
              disabled={vm.isSubmitting}
            />
          )}
        </Field>
        <Field label="Email" required error={vm.errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={vm.values.email}
              onChange={(event) => vm.setField("email", event.target.value)}
              disabled={vm.isSubmitting}
            />
          )}
        </Field>
      </div>
      <Field
        label="Message"
        required
        hint="Writing about a booking? Include your ticket code."
        error={vm.errors.message}
      >
        {(props) => (
          <Textarea
            {...props}
            rows={6}
            maxLength={CONTACT_MESSAGE_MAX}
            value={vm.values.message}
            onChange={(event) => vm.setField("message", event.target.value)}
            disabled={vm.isSubmitting}
          />
        )}
      </Field>

      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={vm.trap}
          onChange={(event) => vm.setTrap(event.target.value)}
        />
      </div>

      <div>
        <Button type="submit" isLoading={vm.isSubmitting}>
          Send message
        </Button>
      </div>
    </form>
  );
}
