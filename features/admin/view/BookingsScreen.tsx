"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import type { TicketDbStatus } from "@/lib/database.types";
import { formatDate, formatShortDateTime } from "@/lib/format";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import { TicketStatusBadge } from "@/features/admin/view/StatusBadges";
import { BOOKINGS_PAGE_SIZE, useBookings } from "@/features/admin/viewmodel/useBookings";

export default function BookingsScreen() {
  const vm = useBookings();
  const { data, error, isLoading, reload } = vm.bookings;
  const hasFilters = vm.filters.search || vm.filters.status !== "all" || vm.filters.eventId !== "all";

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every ticket booked on the site."
        actions={
          <Button variant="secondary" onClick={() => void vm.exportCsv()} isLoading={vm.isExporting}>
            Export CSV
          </Button>
        }
      />

      <section aria-label="Filters" className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-4">
        <Field label="Search" hint="Ticket code, name or email" className="md:col-span-2">
          {(props) => (
            <Input
              {...props}
              type="search"
              value={vm.filters.search}
              onChange={(event) => vm.updateFilter("search", event.target.value)}
            />
          )}
        </Field>
        <Field label="Event">
          {(props) => (
            <Select {...props} value={vm.filters.eventId} onChange={(event) => vm.updateFilter("eventId", event.target.value)}>
              <option value="all">All events</option>
              {vm.eventOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({formatDate(event.startsAt)})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Status">
          {(props) => (
            <Select
              {...props}
              value={vm.filters.status}
              onChange={(event) => vm.updateFilter("status", event.target.value as TicketDbStatus | "all")}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          )}
        </Field>
      </section>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {isLoading && !data ? (
        <SkeletonRows rows={8} label="Loading bookings" />
      ) : data && data.rows.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={hasFilters ? "No bookings match these filters" : "No bookings yet"}
          description={hasFilters ? "Try a different search or filter." : "Bookings appear here as people book tickets."}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={vm.resetFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : data ? (
        <div className="grid gap-3" aria-busy={isLoading}>
          <Table>
            <THead>
              <tr>
                <Th>Code</Th>
                <Th>Event</Th>
                <Th>Holder</Th>
                <Th>Status</Th>
                <Th>Booked</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {data.rows.map((booking) => (
                <tr key={booking.id}>
                  <Td className="font-mono text-xs tracking-wider">{booking.code}</Td>
                  <Td className="min-w-48">
                    <p className="font-medium">{booking.eventTitle}</p>
                    <p className="text-xs text-muted">{formatDate(booking.eventStartsAt)}</p>
                  </Td>
                  <Td className="min-w-48">
                    <p>{booking.holderName || "—"}</p>
                    <p className="text-xs text-muted">{booking.holderEmail}</p>
                  </Td>
                  <Td>
                    <TicketStatusBadge status={booking.status} />
                    {booking.checkedInAt ? (
                      <p className="mt-1 text-xs text-muted">In {formatShortDateTime(booking.checkedInAt)}</p>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatShortDateTime(booking.createdAt)}</Td>
                  <Td className="text-right">
                    {booking.status === "active" ? (
                      <Button variant="ghost" size="sm" onClick={() => vm.setCancelTarget(booking)}>
                        Cancel
                      </Button>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={vm.filters.page}
            pageSize={BOOKINGS_PAGE_SIZE}
            total={data.total}
            onPageChange={(page) => vm.updateFilter("page", page)}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={vm.cancelTarget !== null}
        title={`Cancel ticket ${vm.cancelTarget?.code ?? ""}?`}
        description={`${vm.cancelTarget?.holderName || vm.cancelTarget?.holderEmail || "The holder"} will be notified that their ticket for ${vm.cancelTarget?.eventTitle ?? "this event"} was cancelled. This can't be undone.`}
        confirmLabel="Cancel ticket"
        isLoading={vm.isCancelling}
        onConfirm={() => void vm.confirmCancel()}
        onCancel={() => vm.setCancelTarget(null)}
      />
    </>
  );
}
