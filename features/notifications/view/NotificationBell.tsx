"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useDismiss } from "@/lib/useDismiss";
import { useNotifications } from "@/features/notifications/viewmodel/useNotifications";

export function NotificationBell() {
  const router = useRouter();
  const vm = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, containerRef, triggerRef);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void vm.loadList();
  };

  const label = vm.unread > 0 ? `Notifications, ${vm.unread} unread` : "Notifications";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="notification-panel"
        aria-label={label}
        className="relative grid size-10 place-items-center rounded-full text-lg hover:bg-surface-2"
      >
        <span aria-hidden>🔔</span>
        {vm.unread > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-on-accent"
          >
            {vm.unread > 9 ? "9+" : vm.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id="notification-panel"
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <button
              type="button"
              onClick={() => void vm.markAllRead()}
              disabled={vm.unread === 0}
              className="text-xs font-semibold text-accent-text hover:underline disabled:cursor-default disabled:text-muted disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {vm.isLoadingList && !vm.items ? (
              <div role="status" aria-label="Loading notifications" className="grid gap-2 p-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : vm.error ? (
              <p role="alert" className="p-4 text-sm text-danger">
                {vm.error}
              </p>
            ) : vm.items && vm.items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {vm.items?.map((item) => (
                  <li key={item.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.isRead) void vm.markRead(item.id);
                        if (item.link) {
                          setOpen(false);
                          router.push(item.link);
                        }
                      }}
                      className={cn(
                        "grid w-full gap-0.5 px-4 py-3 text-left hover:bg-surface-2",
                        !item.isRead && "bg-surface-2/60"
                      )}
                    >
                      <span className="flex items-start gap-2">
                        {!item.isRead ? (
                          <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                        ) : null}
                        <span className={cn("text-sm", item.isRead ? "font-medium" : "font-bold")}>{item.title}</span>
                      </span>
                      {item.body ? <span className="line-clamp-2 text-xs text-muted">{item.body}</span> : null}
                      <LocalDateTime iso={item.createdAt} className="text-xs text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
