// Promo codes and add-ons on the organizer event page: form values,
// validation and labels. Mirrors the checks on public.promo_codes and
// public.event_addons, which have the final say. Pure, unit-tested.

import type { DiscountType } from "../../../lib/database.types.ts";

export type FormErrors = Record<string, string>;

const isWholeNumber = (value: string, min: number) => Number.isInteger(Number(value)) && Number(value) >= min;
const time = (value: string) => (value ? new Date(value).getTime() : NaN);
const toMoney = (value: string) => Math.round(Number(value) * 100) / 100;

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------
export const PROMO_CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

// Codes are stored upper case; buyers can type any case.
export function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase();
}

// Strings as typed; dates are <input type="datetime-local"> values.
export type PromoCodeValues = {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export const EMPTY_PROMO_CODE: PromoCodeValues = {
  code: "",
  discountType: "percent",
  discountValue: "",
  maxUses: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

// `uses` = orders that already used the code (the limit can't go below it).
export function validatePromoCode(values: PromoCodeValues, uses = 0): FormErrors {
  const errors: FormErrors = {};
  const code = normalizePromoCode(values.code);
  if (!code) errors.code = "Enter a code.";
  else if (code.length < 3 || code.length > 30) errors.code = "Use 3 to 30 characters.";
  else if (!PROMO_CODE_PATTERN.test(code)) errors.code = "Use letters, numbers, dashes and underscores only.";

  const value = Number(values.discountValue);
  if (values.discountValue.trim() === "" || !Number.isFinite(value) || value <= 0) {
    errors.discountValue = "Enter a discount above 0.";
  } else if (values.discountType === "percent" && value > 100) {
    errors.discountValue = "A percentage can't be more than 100.";
  }

  if (values.maxUses.trim() !== "") {
    if (!isWholeNumber(values.maxUses, 1)) errors.maxUses = "Use a whole number, or leave empty for unlimited.";
    else if (Number(values.maxUses) < uses) errors.maxUses = `Already used ${uses} times; the limit can't be lower.`;
  }

  const start = time(values.startsAt);
  const end = time(values.endsAt);
  if (values.startsAt && Number.isNaN(start)) errors.startsAt = "Enter a valid date and time.";
  if (values.endsAt && Number.isNaN(end)) errors.endsAt = "Enter a valid date and time.";
  else if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) errors.endsAt = "The end must be after the start.";
  return errors;
}

// Database-ready fields from valid form values (dates as ISO, or null).
export function promoCodeFields(values: PromoCodeValues) {
  return {
    code: normalizePromoCode(values.code),
    discount_type: values.discountType,
    discount_value: toMoney(values.discountValue),
    max_uses: values.maxUses.trim() === "" ? null : Number(values.maxUses),
    starts_at: values.startsAt ? new Date(values.startsAt).toISOString() : null,
    ends_at: values.endsAt ? new Date(values.endsAt).toISOString() : null,
    is_active: values.isActive,
  };
}

// "10% off" or "SI$5 off". The formatter is passed in so this stays pure.
export function discountLabel(type: DiscountType, value: number, formatPrice: (amount: number) => string): string {
  return type === "percent" ? `${Number(value)}% off` : `${formatPrice(value)} off`;
}

// "3 uses", "3 / 50 used".
export function usageLabel(used: number, limit: number | null, noun: "used" | "sold"): string {
  if (limit !== null) return `${used} / ${limit} ${noun}`;
  if (noun === "sold") return `${used} sold`;
  return used === 1 ? "1 use" : `${used} uses`;
}

export type PromoAvailability = "active" | "paused" | "scheduled" | "expired" | "used_up";

// Whether buyers can use the code right now (book_ticket checks the same).
export function promoAvailability(
  code: { isActive: boolean; startsAt: string | null; endsAt: string | null; maxUses: number | null; uses: number },
  now: Date
): PromoAvailability {
  if (!code.isActive) return "paused";
  if (code.endsAt && new Date(code.endsAt).getTime() <= now.getTime()) return "expired";
  if (code.maxUses !== null && code.uses >= code.maxUses) return "used_up";
  if (code.startsAt && new Date(code.startsAt).getTime() > now.getTime()) return "scheduled";
  return "active";
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------
export type AddonValues = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  isActive: boolean;
};

export const EMPTY_ADDON: AddonValues = { name: "", description: "", price: "", quantity: "", isActive: true };

// `sold` = add-ons already sold (the quantity can't go below it).
export function validateAddon(values: AddonValues, sold = 0): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Name this add-on.";
  else if (name.length > 60) errors.name = "Keep the name under 60 characters.";

  if (values.description.trim().length > 300) errors.description = "Keep the description under 300 characters.";

  const price = Number(values.price);
  if (values.price.trim() === "" || !Number.isFinite(price) || price < 0) errors.price = "Price must be 0 or more.";

  if (values.quantity.trim() !== "") {
    if (!isWholeNumber(values.quantity, 1)) errors.quantity = "Use a whole number, or leave empty for unlimited.";
    else if (Number(values.quantity) < sold) errors.quantity = `${sold} already sold; quantity can't be lower.`;
  }
  return errors;
}

export function addonFields(values: AddonValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    price: toMoney(values.price),
    quantity: values.quantity.trim() === "" ? null : Number(values.quantity),
    is_active: values.isActive,
  };
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------
export type SortOrderChange = { id: string; sortOrder: number };

// The list with one item moved a step up (-1) or down (+1). An unchanged
// copy when the item is already at that end.
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  const target = index + direction;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// Renumbers the list 0..n-1 in its current order and returns only the rows
// whose sort order changes, so a move writes as few rows as possible.
// sort_order isn't unique, so the writes can land in any order.
export function sortOrderChanges(items: readonly SortOrderChange[]): SortOrderChange[] {
  return items.flatMap((item, index) => (item.sortOrder === index ? [] : [{ id: item.id, sortOrder: index }]));
}

// ---------------------------------------------------------------------------
// Database errors
// ---------------------------------------------------------------------------
export function friendlyExtrasError(
  error: { code?: string; message: string },
  kind: "promo" | "addon",
  action: "save" | "delete"
): string {
  if (error.code === "23505") {
    return kind === "promo" ? "That code already exists for this event." : "An add-on with that name already exists for this event.";
  }
  if (error.code === "23503" && kind === "addon" && action === "delete") return "This add-on has been sold; hide it instead.";
  if (error.code === "23514") return "Some values aren't allowed. Check the form and try again.";
  if (error.code === "42501") return "You can't change this event.";
  return error.message;
}
