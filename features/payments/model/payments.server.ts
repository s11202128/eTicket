import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { PaymentMode } from "@/lib/database.types";
import { DEFAULT_PAYMENT_SETTINGS, type PaymentSettings } from "@/features/payments/model/payments.types";

// Mode and service fee for the booking panel. Read as the anonymous visitor,
// so it can sit in cached public pages. Only used for display: book_ticket
// reads the same row when it prices the order.
export const getPaymentSettings = cache(async (): Promise<PaymentSettings> => {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("payment_settings")
    .select("mode, service_fee_percent")
    .maybeSingle();
  // Before the orders migration runs the table is missing; the old
  // book_ticket charges nothing, which is what the defaults show.
  if (error || !data) return DEFAULT_PAYMENT_SETTINGS;
  return { mode: data.mode as PaymentMode, serviceFeePercent: Number(data.service_fee_percent) };
});
