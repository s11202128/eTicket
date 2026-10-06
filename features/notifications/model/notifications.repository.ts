import { supabase } from "@/lib/supabase";

export type UserNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  isRead: boolean;
};

export async function getUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc("unread_notification_count");
  if (error) throw new Error(error.message);
  return data;
}

export async function listMyNotifications(limit = 15): Promise<UserNotification[]> {
  const { data, error } = await supabase.rpc("list_my_notifications", { max_rows: limit });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.created_at,
    isRead: row.is_read,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", { p_notification_id: id });
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw new Error(error.message);
}
