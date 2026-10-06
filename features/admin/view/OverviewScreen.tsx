"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import { formatDateTime, formatShortDateTime } from "@/lib/format";
import { ErrorState, PageHeader, StatCard } from "@/features/admin/view/AdminUi";
import { CapacityMeter, TicketStatusBadge } from "@/features/admin/view/StatusBadges";
import { useAdminOverview } from "@/features/admin/viewmodel/useAdminOverview";

export default function OverviewScreen() {
  const { data, error, isLoading, reload } = useAdminOverview();

  return (
    <>
      <PageHeader
        title="Overview"
        description="Today at a glance."
        actions={<ButtonLink href="/admin/events/new">New event</ButtonLink>}
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {isLoading || !data ? (
          Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24" />)
        ) : (
          <>
            <StatCard label="Sold today" value={data.stats.ticketsToday} />
            <StatCard label="Sold this week" value={data.stats.ticketsThisWeek} />
            <StatCard label="Upcoming events" value={data.stats.upcomingEvents} />
            <StatCard label="Near capacity" value={data.stats.eventsNearCapacity} hint="80%+ sold" />
            <StatCard label="Users" value={data.stats.totalUsers} />
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section aria-labelledby="recent-bookings" className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 id="recent-bookings" className="text-base font-bold">
              Recent bookings
            </h2>
            <Link href="/admin/bookings" className="text-sm font-semibold text-accent-text hover:underline">
              All bookings
            </Link>
          </div>
          {isLoading || !data ? (
            <SkeletonRows rows={6} label="Loading recent bookings" />
          ) : data.recentBookings.length === 0 ? (
            <EmptyState title="No bookings yet" description="Bookings appear here as soon as people book tickets." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Event</Th>
                  <Th>Holder</Th>
                  <Th>Status</Th>
                  <Th>Booked</Th>
                </tr>
              </THead>
              <TBody>
                {data.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <Td className="max-w-48 truncate font-medium">{booking.eventTitle}</Td>
                    <Td className="max-w-48 truncate">{booking.holderName || booking.holderEmail}</Td>
                    <Td>
                      <TicketStatusBadge status={booking.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatShortDateTime(booking.createdAt)}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        <div className="grid content-start gap-6">
          <Card className="grid gap-3">
            <CardTitle>Close to selling out</CardTitle>
            {isLoading || !data ? (
              <SkeletonRows rows={3} label="Loading events near capacity" />
            ) : data.nearCapacity.length === 0 ? (
              <p className="text-sm text-muted">No events are above 80% capacity.</p>
            ) : (
              <ul className="grid gap-3">
                {data.nearCapacity.map((event) => (
                  <li key={event.eventId} className="grid gap-1">
                    <Link href={`/admin/events/${event.eventId}/edit`} className="text-sm font-semibold hover:underline">
                      {event.title}
                    </Link>
                    <CapacityMeter sold={event.sold} capacity={event.capacity} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="grid gap-3">
            <CardTitle>Upcoming events</CardTitle>
            {isLoading || !data ? (
              <SkeletonRows rows={3} label="Loading upcoming events" />
            ) : data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing scheduled.{" "}
                <Link href="/admin/events/new" className="font-semibold text-accent-text hover:underline">
                  Create an event
                </Link>
              </p>
            ) : (
              <ul className="grid gap-3">
                {data.upcomingEvents.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/events/${event.id}/edit`} className="block truncate text-sm font-semibold hover:underline">
                        {event.title}
                      </Link>
                      <p className="text-xs text-muted">{formatDateTime(event.startsAt)}</p>
                    </div>
                    <CapacityMeter sold={event.sold} capacity={event.capacity} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
