"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState, PageHeader, StatCard } from "@/features/admin/view/AdminUi";
import { CapacityMeter, TicketStatusBadge } from "@/features/admin/view/StatusBadges";
import { useManagerOverview } from "@/features/manager/viewmodel/useManagerOverview";

export default function OverviewScreen() {
  const { data, error, isLoading, reload } = useManagerOverview();

  return (
    <>
      <PageHeader
        title="Overview"
        description="Sales, check-ins and what needs your attention."
        actions={<ButtonLink href="/manager/events/new">Create event</ButtonLink>}
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} label="Loading overview" />
      ) : !data.hasEvents ? (
        <EmptyState
          icon="🎤"
          title="Create your first event"
          description="Add the details, set up ticket types and submit it for approval. Our team usually reviews events within a day."
          action={<ButtonLink href="/manager/events/new">Create event</ButtonLink>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Tickets sold" value={data.ticketsSold} hint="All events, excluding cancelled" />
            <StatCard label="Upcoming events" value={data.upcomingCount} hint="Live and on sale" />
            <StatCard label="Check-ins today" value={data.checkInsToday} />
            <StatCard label="Awaiting approval" value={data.awaitingApproval} hint="Submitted for review" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card className="grid content-start gap-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Next events</CardTitle>
                <Link href="/manager/events" className="text-sm font-semibold text-accent-text hover:underline">
                  All events
                </Link>
              </div>
              {data.nextEvents.length === 0 ? (
                <p className="text-sm text-muted">No live upcoming events.</p>
              ) : (
                <ul className="grid gap-3">
                  {data.nextEvents.map((event) => (
                    <li key={event.id}>
                      <Link
                        href={`/manager/events/${event.id}`}
                        className="grid gap-2 rounded-md border border-border p-3 hover:bg-surface-2 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <span className="grid gap-0.5">
                          <span className="font-semibold">{event.title}</span>
                          <span className="text-xs text-muted">
                            <LocalDateTime iso={event.startsAt} /> · {event.location}
                          </span>
                        </span>
                        <CapacityMeter sold={event.sold} capacity={event.capacity} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="grid content-start gap-4">
              <CardTitle>Recent bookings</CardTitle>
              {data.recentBookings.length === 0 ? (
                <p className="text-sm text-muted">No bookings yet.</p>
              ) : (
                <ul className="grid divide-y divide-border">
                  {data.recentBookings.map((booking) => (
                    <li key={booking.ticketId} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-sm font-semibold">{booking.holderName || "Guest"}</span>
                        <span className="truncate text-xs text-muted">
                          {booking.ticketTypeName} · {booking.eventTitle}
                        </span>
                        <span className="text-xs text-muted">
                          <LocalDateTime iso={booking.bookedAt} />
                        </span>
                      </span>
                      <TicketStatusBadge status={booking.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
