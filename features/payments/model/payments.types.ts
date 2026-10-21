import type { PaymentMode } from "@/lib/database.types";

// Mirrors the payment_settings row. "test": paid orders are confirmed without
// taking money (no provider connected yet). "live": paid orders need a
// provider from paymentProviders; until one exists book_ticket refuses them.
export type PaymentSettings = {
  mode: PaymentMode;
  // Percent added on top of the ticket subtotal; 0 = no fee.
  serviceFeePercent: number;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { mode: "test", serviceFeePercent: 0 };

// What the buyer pays for one booking. book_ticket works this out the same way
// and stores it on the order; the app only shows it.
export type OrderQuote = {
  subtotal: number;
  serviceFee: number;
  total: number;
};

// An order waiting for payment, as a provider sees it.
export type PendingOrder = {
  id: string;
  total: number;
  // ISO 4217, e.g. "SBD".
  currency: string;
  description: string;
  buyerEmail: string | null;
};

// A payment gateway (card, mobile money, ...). Each runs on the server only,
// since providers need secret keys.
export type PaymentProvider = {
  // Stored in orders.payment_provider, e.g. "stripe".
  id: string;
  // Shown at checkout, e.g. "Card (Visa, Mastercard)".
  label: string;
  // Start paying for a pending order: the buyer is sent to redirectUrl, and
  // reference is the provider's id for this payment.
  createCheckout(order: PendingOrder, returnUrl: string): Promise<{ redirectUrl: string; reference: string }>;
  // Check a provider callback is genuine and say what happened; null if it
  // isn't a payment update.
  verifyWebhook(request: Request): Promise<{ reference: string; status: "paid" | "failed" } | null>;
};
