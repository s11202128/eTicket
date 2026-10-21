import type { PaymentProvider } from "@/features/payments/model/payments.types";

// Payment gateways the site can take money through. None yet: bookings run in
// test mode (see payment_settings), so tickets are issued without payment.
//
// To accept real payments:
//  1. Add a provider here (server-only module, keys from environment variables).
//  2. Have booking create the order as 'pending_payment', call createCheckout
//     and send the buyer to its redirectUrl.
//  3. Add a webhook route (app/api/payments/<provider>/route.ts) that uses
//     verifyWebhook, then marks the order paid and issues its tickets.
//  4. List the methods in siteConfig.acceptedPayments and set
//     payment_settings.mode to 'live'.
export const paymentProviders: PaymentProvider[] = [];
