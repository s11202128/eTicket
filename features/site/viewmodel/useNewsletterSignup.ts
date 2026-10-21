"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";
import { validateNewsletterEmail } from "@/features/site/model/contact.schema";
import { subscribeToNewsletter } from "@/features/site/model/contact.repository";

export function useNewsletterSignup() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const checked = validateNewsletterEmail(email);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await subscribeToNewsletter(checked.email);
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      // Same message whether or not the address was already subscribed.
      toast.success("You're on the list. We'll email you about new events.");
      setEmail("");
      setIsDone(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    setEmail: (value: string) => {
      setEmail(value);
      setError(null);
    },
    error,
    isSubmitting,
    isDone,
    submit,
  };
}
