import { supabase } from "@/lib/supabase";
import type { ActionResult } from "@/features/manager/model/managerEvents.repository";
import {
  addonFields,
  friendlyExtrasError,
  sortOrderChanges,
  validateAddon,
  type AddonValues,
  type SortOrderChange,
} from "@/features/manager/model/eventExtras";
import { refreshPublicPages } from "@/lib/refreshPublicPages";

// Add-ons (parking, merch, meals) sold with tickets for one event. Active
// add-ons are public; the organizer and admins see and change all of them.

export type EventAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  // null = unlimited
  quantity: number | null;
  isActive: boolean;
  sortOrder: number;
  // Sold so far (paid or awaiting payment).
  sold: number;
};

export async function listEventAddons(eventId: string): Promise<EventAddon[]> {
  const [{ data, error }, counts] = await Promise.all([
    supabase
      .from("event_addons")
      .select("id, name, description, price, quantity, is_active, sort_order")
      .eq("event_id", eventId)
      .order("sort_order")
      .order("name"),
    supabase.rpc("get_addon_counts", { p_event_ids: [eventId] }),
  ]);
  if (error) throw new Error(error.message);
  if (counts.error) throw new Error(counts.error.message);
  const sold = new Map(counts.data.map((row) => [row.addon_id, row.sold]));

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    quantity: row.quantity,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    sold: sold.get(row.id) ?? 0,
  }));
}

function invalid(values: AddonValues, sold: number): ActionResult | null {
  const errors = Object.values(validateAddon(values, sold));
  return errors.length > 0 ? { ok: false, errorMessage: errors[0] } : null;
}

// New add-ons go to the end of the list.
export async function createEventAddon(eventId: string, values: AddonValues, sortOrder: number): Promise<ActionResult> {
  const problem = invalid(values, 0);
  if (problem) return problem;
  const { error } = await supabase.from("event_addons").insert({ ...addonFields(values), event_id: eventId, sort_order: sortOrder });
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "addon", "save") };
  refreshPublicPages();
  return { ok: true };
}

export async function updateEventAddon(id: string, values: AddonValues, sold: number): Promise<ActionResult> {
  const problem = invalid(values, sold);
  if (problem) return problem;
  const { error } = await supabase.from("event_addons").update(addonFields(values)).eq("id", id);
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "addon", "save") };
  refreshPublicPages();
  return { ok: true };
}

export async function setEventAddonActive(id: string, isActive: boolean): Promise<ActionResult> {
  const { error } = await supabase.from("event_addons").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "addon", "save") };
  refreshPublicPages();
  return { ok: true };
}

// Saves a new order: `addons` is the whole list in the order buyers should
// see it, with the sort orders it was loaded with. Only rows that move are
// written. If one write fails the others may still have landed, so reload.
export async function reorderEventAddons(addons: SortOrderChange[]): Promise<ActionResult> {
  const changes = sortOrderChanges(addons);
  if (changes.length === 0) return { ok: true };
  const results = await Promise.all(
    changes.map((change) =>
      supabase.from("event_addons").update({ sort_order: change.sortOrder }).eq("id", change.id).select("id")
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, errorMessage: friendlyExtrasError(failed.error, "addon", "save") };
  // No row back: deleted meanwhile, or not allowed (RLS hides it silently).
  if (results.some((result) => result.data?.length === 0)) {
    return { ok: false, errorMessage: "Couldn't save the new order. The list was changed elsewhere; try again." };
  }
  refreshPublicPages();
  return { ok: true };
}

// Fails once the add-on has been sold (order_addons restricts the delete).
export async function deleteEventAddon(id: string): Promise<ActionResult> {
  const { data, error } = await supabase.from("event_addons").delete().eq("id", id).select("id");
  if (error) return { ok: false, errorMessage: friendlyExtrasError(error, "addon", "delete") };
  if (data.length === 0) return { ok: false, errorMessage: "That add-on was already removed." };
  refreshPublicPages();
  return { ok: true };
}
