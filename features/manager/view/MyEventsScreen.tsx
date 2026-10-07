"use client";

import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { CapacityMeter, EventStatusBadge } from "@/features/admin/view/StatusBadges";
import type { EventMeta } from "@/features/manager/model/managerEvents.repository";
import { useMyEvents } from "@/features/manager/viewmodel/useMyEvents";

const EMPTY_COPY: Record<string, string> = {
  drafts: "No drafts. Start a new event and it's saved here as you go.",
  review: "Nothing waiting for approval.",
  changes: "No events need changes.",
  live: "No live events right now.",
  past: "Past events show up here after they end.",
  rejected: "No rejected events.",
};

export default function MyEventsScreen() {
  const vm = useMyEvents();

  return (
    <>
      <PageHeader
        title="My Events"
        description="Drafts, events in review and everything that's on sale."
        actions={<ButtonLink href="/manager/events/new">Create event</ButtonLink>}
      />

      {vm.error ? (
        <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
      ) : vm.isLoading ? (
        <SkeletonRows rows={6} label="Loading events" />
      ) : !vm.hasEvents ? (
        <EmptyState
          icon="🎟"
          title="No events yet"
          description="Create your first event: add details, ticket types and a cover image, then submit it for approval."
          action={<ButtonLink href="/manager/events/new">Create event</ButtonLink>}
        />
      ) : (
        <div className="grid gap-5">
          <div className="overflow-x-auto">
            <Tabs tabs={vm.tabs} value={vm.activeTab} onChange={vm.setTab} label="Event status" idPrefix="my-events" />
          </div>
          <div id={`my-events-panel-${vm.activeTab}`} role="tabpanel" aria-labelledby={`my-events-tab-${vm.activeTab}`}>
            {vm.events.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
                {EMPTY_COPY[vm.activeTab]}
              </p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {vm.events.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EventCard({ event }: { event: EventMeta }) {
  const showNote = (event.status === "changes_requested" || event.status === "rejected") && event.reviewNote;

  return (
    <Link
      href={`/manager/events/${event.id}`}
      className="grid h-full overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-fg/30 sm:grid-cols-[140px_1fr]"
    >
      <div className="relative h-36 sm:h-full">
        <Image src={event.imageSrc} alt="" fill sizes="(min-width: 640px) 140px, 100vw" className="object-cover" />
      </div>
      <div className="grid content-start gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge status={event.status} />
          {event.cancellationRequested ? <span className="text-xs font-semibold text-danger">Cancellation requested</span> : null}
        </div>
        <p className="font-bold leading-snug">{event.title}</p>
        <p className="text-xs text-muted">
          <LocalDateTime iso={event.startsAt} /> · {event.location}
        </p>
        {showNote ? (
          <div className="rounded-md border border-warning/40 bg-warning-bg p-2.5 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-warning">
              {event.status === "rejected" ? "Reason from our team" : "Changes requested"}
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-fg">{event.reviewNote}</p>
          </div>
        ) : null}
        {event.status === "published" || event.status === "completed" ? (
          <CapacityMeter sold={event.sold} capacity={event.capacity} />
        ) : null}
      </div>
    </Link>
  );
}
