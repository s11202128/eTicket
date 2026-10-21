import type { DiscountType } from "@/lib/database.types";
import type { OrderQuote } from "@/features/payments/model/payments.types";

export type PromoDiscount = { type: DiscountType; value: number };

export type QuoteInput = {
  unitPrice: number;
  quantity: number;
  // Each chosen add-on: price × quantity.
  addons?: { price: number; quantity: number }[];
  promo?: PromoDiscount | null;
  serviceFeePercent: number;
};

// Round to cents like Postgres round(x, 2): halves go away from zero.
function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Same sums as book_ticket: the promo code discounts the tickets only, the
// service fee is charged on what's left, and free orders never pay a fee.
export function quoteOrder({ unitPrice, quantity, addons = [], promo = null, serviceFeePercent }: QuoteInput): OrderQuote {
  const tickets = toCents(unitPrice * quantity);
  const addonsTotal = toCents(addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0));
  const discount = !promo
    ? 0
    : promo.type === "percent"
      ? toCents((tickets * promo.value) / 100)
      : Math.min(promo.value, tickets);
  const afterDiscount = toCents(tickets + addonsTotal - discount);
  const serviceFee = afterDiscount === 0 ? 0 : toCents((afterDiscount * serviceFeePercent) / 100);
  return {
    subtotal: toCents(tickets + addonsTotal),
    discount,
    serviceFee,
    total: toCents(afterDiscount + serviceFee),
  };
}
