import { supabase } from "@/lib/supabase";
import { ilikePattern, pageRange, sanitizeSearch } from "@/lib/search";
import type { ActionResult, Paged } from "@/features/admin/model/admin.types";
import { collectPages } from "@/features/admin/model/subscribers";

// Newsletter subscribers. Only admins can read or remove them (RLS);
// sign-ups go through subscribe_newsletter.

export type SubscriberRow = {
  id: string;
  email: string;
  createdAt: string;
};

// Safety cap for the CSV export.
export const SUBSCRIBERS_EXPORT_LIMIT = 50_000;

// Newest first; id breaks ties so paging is stable.
function subscribersQuery(search: string, range: [number, number], withCount: boolean) {
  let query = supabase
    .from("newsletter_subscribers")
    .select("id, email, created_at", withCount ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(range[0], range[1]);
  const term = sanitizeSearch(search);
  if (term) query = query.ilike("email", ilikePattern(term.toLowerCase()));
  return query;
}

function toRow(row: { id: string; email: string; created_at: string }): SubscriberRow {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export async function listSubscribers(search: string, page: number, pageSize = 20): Promise<Paged<SubscriberRow>> {
  const { data, error, count } = await subscribersQuery(search, pageRange(page, pageSize), true);
  if (error) throw new Error(error.message);
  return { total: count ?? 0, rows: data.map(toRow) };
}

// Everyone on the list, ignoring any search.
export async function countSubscribers(): Promise<number> {
  const { count, error } = await supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Every subscriber matching the search (all of them when it's empty),
// loaded in batches, up to SUBSCRIBERS_EXPORT_LIMIT.
export async function listSubscribersForExport(search: string): Promise<SubscriberRow[]> {
  return collectPages(
    async (from, to) => {
      const { data, error } = await subscribersQuery(search, [from, to], false);
      if (error) throw new Error(error.message);
      return data.map(toRow);
    },
    undefined,
    SUBSCRIBERS_EXPORT_LIMIT
  );
}

export async function removeSubscriber(id: string): Promise<ActionResult> {
  const { data, error } = await supabase.from("newsletter_subscribers").delete().eq("id", id).select("id");
  if (error) return { ok: false, errorMessage: error.message };
  if (data.length === 0) return { ok: false, errorMessage: "That subscriber was already removed." };
  return { ok: true, data: undefined };
}
