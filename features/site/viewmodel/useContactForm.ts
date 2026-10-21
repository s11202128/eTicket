"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  EMPTY_CONTACT_FORM,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "@/features/site/model/contact.schema";
import { sendContactMessage } from "@/features/site/model/contact.repository";

const SENT_MESSAGE = "Thanks, your message has been sent. We'll reply by email.";

export function useContactForm() {
  const toast = useToast();
  const [values, setValues] = useState<ContactFormValues>(EMPTY_CONTACT_FORM);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  // Honeypot: hidden from people, so only bots fill it in.
  const [trap, setTrap] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const setField = (key: keyof ContactFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const finish = () => {
    toast.success(SENT_MESSAGE);
    setValues(EMPTY_CONTACT_FORM);
    setIsSent(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const checked = validateContactForm(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    // A bot filled the hidden field: act as if it worked, send nothing.
    if (trap) {
      finish();
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await sendContactMessage(checked.data);
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      finish();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    errors,
    setField,
    trap,
    setTrap,
    isSubmitting,
    isSent,
    sendAnother: () => setIsSent(false),
    submit,
  };
}
