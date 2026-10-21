import { supabase } from "@/lib/supabase";
import type { ContactMessageInput } from "@/features/site/model/contact.schema";

// Newsletter sign-up and contact form. Both work signed in or out; the
// database functions validate again and are the only way to write.

export type SendResult = { ok: true } | { ok: false; errorMessage: string };

// Subscribing an address that's already on the list also succeeds.
export async function subscribeToNewsletter(email: string): Promise<SendResult> {
  const { error } = await supabase.rpc("subscribe_newsletter", { p_email: email });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}

export async function sendContactMessage(input: ContactMessageInput): Promise<SendResult> {
  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: input.name,
    p_email: input.email,
    p_message: input.message,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}
