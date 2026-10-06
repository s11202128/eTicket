"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentRole,
  getCurrentUserProfile,
  hasActiveSession,
} from "@/features/auth/model/session.repository";
import { listMyTickets } from "@/features/tickets/model/tickets.repository";

const NOTIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const NOTICES: Record<string, string> = {
  "not-authorized": "You don't have access to that page.",
};

type AppShellViewModel = {
  isReady: boolean;
  avatarUrl: string;
  notifications: number;
  canOpenAdmin: boolean;
  notice: string | null;
};

// Guards signed-in pages and loads what the sidebar and top bar need.
export function useAppShellViewModel(): AppShellViewModel {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifications, setNotifications] = useState(0);
  const [canOpenAdmin, setCanOpenAdmin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const isAuthenticated = await hasActiveSession();
      if (!isAuthenticated) {
        router.replace("/login");
        return;
      }

      if (isMounted) {
        setIsReady(true);
        const code = new URLSearchParams(window.location.search).get("notice");
        setNotice(code ? (NOTICES[code] ?? null) : null);
      }

      try {
        const [profile, tickets, role] = await Promise.all([
          getCurrentUserProfile(),
          listMyTickets(),
          getCurrentRole(),
        ]);
        const now = Date.now();
        const soon = tickets.filter((ticket) => {
          if (ticket.status !== "active" || !ticket.events) return false;
          const startsAt = new Date(ticket.events.starts_at).getTime();
          return startsAt >= now && startsAt - now <= NOTIFY_WINDOW_MS;
        });

        if (isMounted) {
          setAvatarUrl(profile?.avatarUrl ?? "");
          setNotifications(soon.length);
          setCanOpenAdmin(role === "admin" || role === "staff");
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

  return { isReady, avatarUrl, notifications, canOpenAdmin, notice };
}
