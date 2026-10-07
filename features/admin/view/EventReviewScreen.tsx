"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/format";
import type { PublicEvent } from "@/features/events/model/events.types";
import { EventDetailScreen } from "@/features/events/view/EventDetailScreen";
import { ErrorState } from "@/features/admin/view/AdminUi";
import { EventStatusBadge } from "@/features/admin/view/StatusBadges";
import type { EventForReview } from "@/features/admin/model/reviews.repository";
import { useEventReview } from "@/features/admin/viewmodel/useEventReview";

const HISTORY_LABELS: Record<string, string> = {
  "event.submitted": "Submitted for review",
  "event.approve": "Approved",
  "event.request_changes": "Changes requested",
  "event.reject": "Rejected",
  "event.updated_live": "Live event edited",
  "event.cancellation_requested": "Cancellation requested",
  "event.cancellation_declined": "Cancellation declined",
  "event.cancelled": "Cancelled",
  "event.staff_added": "Door staff added",
};

function toPublicEvent(event: EventForReview): PublicEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endAt: event.endAt,
    location: event.location,
    price: event.price,
    imageSrc: event.imageSrc,
    categoryName: event.categoryName,
    categorySlug: event.categoryName ? "preview" : null,
    capacity: event.capacity,
    sold: 0,
    spotsLeft: event.capacity,
    isSoldOut: false,
    isPast: false,
    maxTicketsPerUser: event.maxTicketsPerUser,
    status: "published",
    region: event.region,
  };
}

export default function EventReviewScreen({ eventId }: { eventId: string }) {
  const vm = useEventReview(eventId);

  if (vm.error) return <ErrorState message={vm.error} onRetry={() => void vm.reload()} />;
  if (vm.isLoading) return <SkeletonRows rows={8} label="Loading event" />;
  if (!vm.event) return <ErrorState message="Event not found." />;
  const event = vm.event;
  const pending = event.status === "pending_review";

  return (
    <>
      <div className="grid gap-2">
        <Link href="/admin/reviews" className="text-sm font-semibold text-muted hover:text-fg">
          ← Review queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">{event.title}</h1>
          <EventStatusBadge status={event.status} />
        </div>
        {event.submittedAt ? (
          <p className="text-sm text-muted">
            Submitted <LocalDateTime iso={event.submittedAt} />
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <section aria-label="Public page preview" className="grid content-start gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Exactly what visitors will see</p>
          <div className="theme-public max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-bg text-fg">
            <div className="pointer-events-none select-none">
              <EventDetailScreen event={toPublicEvent(event)} isSignedIn isAdmin={false} preview />
            </div>
          </div>
        </section>

        <div className="grid content-start gap-4">
          {pending ? (
            <Card className="grid gap-3">
              <CardTitle>Decision</CardTitle>
              <Field
                label="Note to the organizer"
                error={vm.noteError ?? undefined}
                hint="Required to request changes or reject. Optional when approving."
              >
                {(props) => (
                  <Textarea {...props} rows={4} maxLength={2000} value={vm.note} onChange={(changeEvent) => vm.setNote(changeEvent.target.value)} />
                )}
              </Field>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <Button onClick={() => void vm.decide("approve")} isLoading={vm.busy === "approve"} disabled={Boolean(vm.busy)}>
                  Approve &amp; publish
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void vm.decide("request_changes")}
                  isLoading={vm.busy === "request_changes"}
                  disabled={Boolean(vm.busy)}
                >
                  Request changes
                </Button>
                <Button variant="danger" onClick={() => void vm.decide("reject")} isLoading={vm.busy === "reject"} disabled={Boolean(vm.busy)}>
                  Reject
                </Button>
              </div>
            </Card>
          ) : (
            <p role="status" className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              This event isn&apos;t waiting for review any more.
            </p>
          )}

          <Card className="grid gap-3">
            <CardTitle>Organizer</CardTitle>
            {event.organizer ? (
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-3">
                  {event.organizer.logoUrl ? (
                    <Image src={event.organizer.logoUrl} alt="" width={40} height={40} unoptimized className="size-10 rounded-md object-cover" />
                  ) : null}
                  <div>
                    <p className="font-semibold">{event.organizer.organizationName}</p>
                    <p className="text-muted">
                      {event.organizer.name} · {event.organizer.email}
                    </p>
                  </div>
                </div>
                <p className="text-muted">
                  {event.organizer.phone ? `${event.organizer.phone} · ` : ""}
                  {event.organizer.liveEvents} live event{event.organizer.liveEvents === 1 ? "" : "s"}
                  {event.organizer.status !== "approved" ? (
                    <>
                      {" · "}
                      <Badge tone="danger">{event.organizer.status}</Badge>
                    </>
                  ) : null}
                </p>
                {event.organizer.website ? (
                  <a href={event.organizer.website} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent-text hover:underline">
                    {event.organizer.website}
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Platform event (created by an admin).</p>
            )}
          </Card>

          <Card className="grid gap-3">
            <CardTitle>Ticket types</CardTitle>
            <ul className="grid divide-y divide-border text-sm">
              {event.ticketTypes.map((type) => (
                <li key={type.id} className="grid gap-0.5 py-2">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold">{type.name}</span>
                    <span className="tabular-nums">{formatPrice(type.price)}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {type.quantity === null ? "Unlimited" : `${type.quantity} tickets`}
                    {type.sold ? ` · ${type.sold} sold` : ""}
                    {type.salesStart ? (
                      <>
                        {" · from "}
                        <LocalDateTime iso={type.salesStart} />
                      </>
                    ) : null}
                    {type.salesEnd ? (
                      <>
                        {" · until "}
                        <LocalDateTime iso={type.salesEnd} />
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Up to {event.maxTicketsPerUser} tickets per person.</p>
          </Card>

          <Card className="grid gap-3">
            <CardTitle>History</CardTitle>
            {event.history.length === 0 ? (
              <p className="text-sm text-muted">No history yet.</p>
            ) : (
              <ol className="grid gap-3 border-l border-border pl-4 text-sm">
                {event.history.map((entry) => (
                  <li key={entry.id} className="grid gap-0.5">
                    <span className="font-semibold">{HISTORY_LABELS[entry.action] ?? entry.action}</span>
                    <span className="text-xs text-muted">
                      {entry.actorName ? `${entry.actorName} · ` : ""}
                      <LocalDateTime iso={entry.createdAt} />
                    </span>
                    {entry.note ? <span className="whitespace-pre-line rounded bg-surface-2 p-2 text-xs">{entry.note}</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
