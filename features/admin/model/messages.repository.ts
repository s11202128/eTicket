import { supabase } from "@/lib/supabase";
import { pageRange } from "@/lib/search";
import type { ActionResult, Paged } from "@/features/admin/model/admin.types";

// Contact form messages. Only admins can read them or mark them handled
// (RLS); handled_by is filled in by the database.

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  handledAt: string | null;
};

export type MessageFilter = "open" | "handled" | "all";

export async function listContactMessages(filter: MessageFilter, page: number, pageSize = 20): Promise<Paged<ContactMessageRow>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase
    .from("contact_messages")
    .select("id, name, email, message, created_at, handled_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filter === "open") query = query.is("handled_at", null);
  if (filter === "handled") query = query.not("handled_at", "is", null);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      message: row.message,
      createdAt: row.created_at,
      handledAt: row.handled_at,
    })),
  };
}

// handled = false reopens the message.
export async function setMessageHandled(id: string, handled: boolean): Promise<ActionResult> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ handled_at: handled ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data: undefined };
}
