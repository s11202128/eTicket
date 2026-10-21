import { z } from "zod";

// Newsletter and contact form checks. Mirror the database checks in
// subscribe_newsletter / submit_contact_message, which have the final say.

// Same rule as the database: something@something.something, at most 254 characters.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "Keep the email under 254 characters.")
  .regex(EMAIL_PATTERN, "Enter a valid email address.");

export const newsletterSchema = z.object({ email });

export function validateNewsletterEmail(value: string): { ok: true; email: string } | { ok: false; error: string } {
  const result = newsletterSchema.safeParse({ email: value });
  return result.success ? { ok: true, email: result.data.email } : { ok: false, error: result.error.issues[0].message };
}

// Raw form values (as typed).
export type ContactFormValues = {
  name: string;
  email: string;
  message: string;
};

export const EMPTY_CONTACT_FORM: ContactFormValues = { name: "", email: "", message: "" };

export const CONTACT_MESSAGE_MAX = 4000;

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Keep your name under 100 characters."),
  email,
  message: z
    .string()
    .trim()
    .min(1, "Enter your message.")
    .max(CONTACT_MESSAGE_MAX, `Keep the message under ${CONTACT_MESSAGE_MAX} characters.`),
});

export type ContactMessageInput = z.output<typeof contactFormSchema>;

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

export function validateContactForm(
  values: ContactFormValues
): { ok: true; data: ContactMessageInput } | { ok: false; errors: ContactFormErrors } {
  const result = contactFormSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const errors: ContactFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ContactFormValues;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
