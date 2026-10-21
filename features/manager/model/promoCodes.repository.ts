import { supabase } from "@/lib/supabase";
import type { DiscountType } from "@/lib/database.types";
import type { ActionResult } from "@/features/manager/model/managerEvents.repository";
import {
  friendlyExtrasError,
  promoCodeFields,
  validatePromoCode,
  type PromoCodeValues,
} from "@/features/manager/model/eventExtras";

// Promo codes for one event. Row-level security lets only the event's
// organizer and admins read or change them.

export type PromoCode = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  // Orders that used the code (paid or awaiting payment).
  uses: number;
};

async function promoUses(eventId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("orders")
    .select("promo_code_id")
    .eq("event_id", eventId)
    .not("promo_code_id", "is", null)
    .in("status", ["paid", "pending_payment"]);
  if (error) throw new Error(error.message);
  const uses = new Map<string, number>();
  for (const row of data) {
    if (row.promo_code_id) uses.set(row.promo_code_id, (uses.get(row.promo_code_id) ?? 0) + 1);
  }
  return uses;
}

export async function listPromoCodes(eventId: string): Promise<PromoCode[]> {
  const [{ data, error }, uses] = await Promise.all([
    supabase
      .from("promo_codes")
      .select("id, code, discount_type, discount_value, max_uses, starts_at, ends_at, is_active")
      .eq("event_id", eventId)
      .order("created_at"),
    promoUses(eventId),
  ]);
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    discountType: row.discount_type as DiscountType,
    discountValue: Number(row.discount_value),
    maxUses: row.max_uses,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    uses: uses.get(row.id) ?? 0,
  }));
}

function invalid(values: PromoCodeValues, uses: number): ActionResult | null {
  const errors = Object.values(validatePromoCode(values, uses));
  return errors.length > 0 ? { ok: false, errorMessage: errors[0] } : null;
}

export async function createPromoCode(eventId: string, values: PromoCodeValues): Promise<ActionResult> {
  const problem = invalid(values, 0);
  if (problem) return problem;
  const { error } = await supabase.from("promo_codes").insert({ ...promoCodeFields(values), event_id: eventId });
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "promo", "save") };
  return { ok: true };
}

export async function updatePromoCode(id: string, values: PromoCodeValues, uses: number): Promise<ActionResult> {
  const problem = invalid(values, uses);
  if (problem) return problem;
  const { error } = await supabase.from("promo_codes").update(promoCodeFields(values)).eq("id", id);
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "promo", "save") };
  return { ok: true };
}

export async function setPromoCodeActive(id: string, isActive: boolean): Promise<ActionResult> {
  const { error } = await supabase.from("promo_codes").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "promo", "save") };
  return { ok: true };
}

// Orders that used the code keep their discount; the link is cleared.
export async function deletePromoCode(id: string): Promise<ActionResult> {
  const { data, error } = await supabase.from("promo_codes").delete().eq("id", id).select("id");
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "promo", "delete") };
  if (data.length === 0) return { ok: false, errorMessage: "That code was already removed." };
  return { ok: true };
}
