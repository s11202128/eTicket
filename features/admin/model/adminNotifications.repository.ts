import { supabase } from "@/lib/supabase";
import type { ActionResult, SentNotification } from "@/features/admin/model/admin.types";

export type NotificationDraft = {
  title: string;
  body: string;
  link: string;
};

function clean(draft: NotificationDraft) {
  return {
    title: draft.title.trim(),
    body: draft.body.trim() || null,
    link: draft.link.trim() || null,
  };
}

// One shared row; every user sees it in their notifications.
export async function sendBroadcast(draft: NotificationDraft): Promise<ActionResult> {
  const { error } = await supabase.from("notifications").insert({ ...clean(draft), user_id: null });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data: undefined };
}

// One row per person holding an active or used ticket. Returns how many.
export async function sendToEventHolders(eventId: string, draft: NotificationDraft): Promise<ActionResult<number>> {
  const values = clean(draft);
  const { data, error } = await supabase.rpc("admin_notify_event_holders", {
    p_event_id: eventId,
    p_title: values.title,
    p_body: values.body ?? undefined,
    p_link: values.link ?? undefined,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data };
}

export async function listRecentBroadcasts(): Promise<SentNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at")
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.created_at,
  }));
}
