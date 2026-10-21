import type { OrderQuote } from "@/features/payments/model/payments.types";

// Round to cents like Postgres round(x, 2): halves go away from zero.
function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Same sums as book_ticket: free orders never pay a fee.
export function quoteOrder(unitPrice: number, quantity: number, serviceFeePercent: number): OrderQuote {
  const subtotal = toCents(unitPrice * quantity);
  const serviceFee = subtotal === 0 ? 0 : toCents((subtotal * serviceFeePercent) / 100);
  return { subtotal, serviceFee, total: toCents(subtotal + serviceFee) };
}
