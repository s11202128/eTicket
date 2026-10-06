"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserProfile,
  hasActiveSession,
} from "@/features/auth/model/session.repository";
import { listMyTickets } from "@/features/tickets/model/tickets.repository";

const NOTIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type AppShellViewModel = {
  isReady: boolean;
  avatarUrl: string;
  notifications: number;
};

// Guards signed-in pages and loads what the sidebar and top bar need.
export function useAppShellViewModel(): AppShellViewModel {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const isAuthenticated = await hasActiveSession();
      if (!isAuthenticated) {
        router.replace("/login");
        return;
      }

      if (isMounted) setIsReady(true);

      try {
        const [profile, tickets] = await Promise.all([getCurrentUserProfile(), listMyTickets()]);
        const now = Date.now();
        const soon = tickets.filter((ticket) => {
          if (ticket.status !== "active" || !ticket.events) return false;
          const startsAt = new Date(ticket.events.starts_at).getTime();
          return startsAt >= now && startsAt - now <= NOTIFY_WINDOW_MS;
        });

        if (isMounted) {
          setAvatarUrl(profile?.avatarUrl ?? "");
          setNotifications(soon.length);
        }
      } catch {
        // The shell still works without avatar and notification data.
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return { isReady, avatarUrl, notifications };
}
