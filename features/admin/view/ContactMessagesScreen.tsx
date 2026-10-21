"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import type { MessageFilter } from "@/features/admin/model/messages.repository";
import { MESSAGES_PAGE_SIZE, useContactMessages } from "@/features/admin/viewmodel/useContactMessages";

const FILTER_TABS: { id: MessageFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "handled", label: "Handled" },
  { id: "all", label: "All" },
];

export default function ContactMessagesScreen() {
  const vm = useContactMessages();

  return (
    <>
      <PageHeader title="Messages" description="Sent from the Contact page. Reply by email, then mark them handled." />

      <div className="grid gap-4">
        <div className="overflow-x-auto">
          <Tabs tabs={FILTER_TABS} value={vm.filter} onChange={vm.setFilter} label="Message status" idPrefix="messages" />
        </div>

        <div id={`messages-panel-${vm.filter}`} role="tabpanel" aria-labelledby={`messages-tab-${vm.filter}`} className="grid gap-3">
          {vm.error ? (
            <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
          ) : vm.isLoading ? (
            <SkeletonRows rows={4} label="Loading messages" />
          ) : vm.rows.length === 0 ? (
            <EmptyState
              icon="✉"
              title={vm.filter === "open" ? "No open messages" : "Nothing here"}
              description={vm.filter === "open" ? "New messages from the Contact page appear here." : undefined}
            />
          ) : (
            <>
              <ul className="grid gap-4">
                {vm.rows.map((message) => (
                  <li key={message.id}>
                    <Card className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div className="grid min-w-0 gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{message.name}</span>
                          {message.handledAt ? <Badge tone="success">Handled</Badge> : <Badge tone="warning">Open</Badge>}
                        </div>
                        <p className="text-sm text-muted">
                          <a href={`mailto:${message.email}`} className="break-all font-semibold text-fg hover:underline">
                            {message.email}
                          </a>
                          {" · "}
                          <LocalDateTime iso={message.createdAt} />
                          {message.handledAt ? (
                            <>
                              {" · handled "}
                              <LocalDateTime iso={message.handledAt} />
                            </>
                          ) : null}
                        </p>
                        <blockquote className="rounded-md bg-surface-2 p-3 text-sm break-words whitespace-pre-line">
                          {message.message}
                        </blockquote>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col">
                        <Button
                          variant={message.handledAt ? "secondary" : "primary"}
                          isLoading={vm.workingId === message.id}
                          disabled={vm.workingId !== null && vm.workingId !== message.id}
                          onClick={() => void vm.toggleHandled(message)}
                        >
                          {message.handledAt ? "Reopen" : "Mark handled"}
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
              <Pagination page={vm.page} pageSize={MESSAGES_PAGE_SIZE} total={vm.total} onPageChange={vm.setPage} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
