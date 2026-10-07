"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useAsyncData } from "@/lib/useAsyncData";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "@/features/notifications/model/notifications.repository";

// Full notification history (the bell shows only the latest few).
export default function NotificationsScreen() {
  const router = useRouter();
  const { data, error, isLoading, reload } = useAsyncData(() => listMyNotifications(50), "notifications");
  const [isMarking, setIsMarking] = useState(false);
  const unread = (data ?? []).filter((item) => !item.isRead).length;

  const open = async (item: UserNotification) => {
    if (!item.isRead) await markNotificationRead(item.id).catch(() => undefined);
    if (item.link) router.push(item.link);
    else await reload();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Approvals, review notes, team changes and other updates."
        actions={
          unread > 0 ? (
            <Button
              variant="secondary"
              isLoading={isMarking}
              onClick={() => {
                setIsMarking(true);
                void markAllNotificationsRead()
                  .then(reload)
                  .finally(() => setIsMarking(false));
              }}
            >
              Mark all as read
            </Button>
          ) : null
        }
      />
      {error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} label="Loading notifications" />
      ) : data.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications yet" description="We'll let you know here when something needs your attention." />
      ) : (
        <ul className="grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void open(item)}
                className={cn("grid w-full gap-1 px-4 py-3 text-left hover:bg-surface-2", !item.isRead && "bg-accent/5")}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {!item.isRead ? <span aria-label="Unread" className="size-2 rounded-full bg-accent" /> : null}
                  {item.title}
                </span>
                {item.body ? <span className="text-sm text-muted">{item.body}</span> : null}
                <span className="text-xs text-muted">
                  <LocalDateTime iso={item.createdAt} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
