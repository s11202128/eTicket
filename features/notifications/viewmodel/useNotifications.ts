"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getUnreadCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "@/features/notifications/model/notifications.repository";

const POLL_MS = 60_000;

// Unread count (polled, and refreshed when the tab regains focus) plus the
// list shown in the bell dropdown, loaded when it opens.
export function useNotifications() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await getUnreadCount());
    } catch {
      // A failed poll keeps the last known count.
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), POLL_MS);
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  const loadList = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      setItems(await listMyNotifications());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't load notifications.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems((current) => current?.map((item) => (item.id === id ? { ...item, isRead: true } : item)) ?? null);
    setUnread((count) => Math.max(count - 1, 0));
    try {
      await markNotificationRead(id);
    } finally {
      void refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    setItems((current) => current?.map((item) => ({ ...item, isRead: true })) ?? null);
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } finally {
      void refreshCount();
    }
  }, [refreshCount]);

  return { unread, items, isLoadingList, error, loadList, markRead, markAllRead };
}
