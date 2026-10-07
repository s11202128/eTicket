"use client";

import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import type { EventStatus } from "@/lib/database.types";
import { formatDateTime, formatPrice } from "@/lib/format";
import { REGION_LABELS } from "@/lib/regions";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import { CapacityMeter, EventStatusBadge } from "@/features/admin/view/StatusBadges";
import { EVENTS_PAGE_SIZE, useAdminEvents } from "@/features/admin/viewmodel/useAdminEvents";

export default function EventsAdminScreen() {
  const vm = useAdminEvents();
  const { data, error, isLoading, reload } = vm.events;
  const hasFilters =
    vm.filters.search || vm.filters.status !== "all" || vm.filters.categoryId !== "all" || vm.filters.from || vm.filters.to;

  return (
    <>
      <PageHeader
        title="Events"
        description="Create, publish and manage every event shown on the site."
        actions={<ButtonLink href="/admin/events/new">New event</ButtonLink>}
      />

      <section aria-label="Filters" className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Search" className="lg:col-span-2">
          {(props) => (
            <Input
              {...props}
              type="search"
              placeholder="Event title"
              value={vm.filters.search}
              onChange={(event) => vm.updateFilter("search", event.target.value)}
            />
          )}
        </Field>
        <Field label="Status">
          {(props) => (
            <Select
              {...props}
              value={vm.filters.status}
              onChange={(event) => vm.updateFilter("status", event.target.value as EventStatus | "all")}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_review">In review</option>
              <option value="changes_requested">Changes requested</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </Select>
          )}
        </Field>
        <Field label="Category">
          {(props) => (
            <Select
              {...props}
              value={vm.filters.categoryId}
              onChange={(event) => vm.updateFilter("categoryId", event.target.value)}
            >
              <option value="all">All categories</option>
              {vm.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
          <Field label="From">
            {(props) => (
              <Input {...props} type="date" value={vm.filters.from} onChange={(event) => vm.updateFilter("from", event.target.value)} />
            )}
          </Field>
          <Field label="To">
            {(props) => (
              <Input {...props} type="date" value={vm.filters.to} onChange={(event) => vm.updateFilter("to", event.target.value)} />
            )}
          </Field>
        </div>
        {hasFilters ? (
          <div className="sm:col-span-2 lg:col-span-5">
            <Button variant="ghost" size="sm" onClick={vm.resetFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </section>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {isLoading && !data ? (
        <SkeletonRows rows={8} label="Loading events" />
      ) : data && data.rows.length === 0 ? (
        <EmptyState
          icon="🎟"
          title={hasFilters ? "No events match these filters" : "No events yet"}
          description={hasFilters ? "Try different filters." : "Create your first event to show it on the site."}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={vm.resetFilters}>
                Clear filters
              </Button>
            ) : (
              <ButtonLink href="/admin/events/new">New event</ButtonLink>
            )
          }
        />
      ) : data ? (
        <div className="grid gap-3" aria-busy={isLoading}>
          <Table>
            <THead>
              <tr>
                <Th>Event</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Price</Th>
                <Th>Sold</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {data.rows.map((event) => (
                <tr key={event.id}>
                  <Td className="min-w-56">
                    <Link href={`/admin/events/${event.id}/edit`} className="font-semibold hover:underline">
                      {event.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {event.categoryName ?? "Uncategorised"} · {REGION_LABELS[event.region]}
                      {event.isFeatured ? " · ★ Featured" : ""}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(event.startsAt)}</Td>
                  <Td>
                    <EventStatusBadge status={event.status} />
                  </Td>
                  <Td className="whitespace-nowrap">{formatPrice(event.price)}</Td>
                  <Td>
                    <CapacityMeter sold={event.sold} capacity={event.capacity} />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <ButtonLink href={`/admin/events/${event.id}/edit`} variant="secondary" size="sm">
                        Edit
                      </ButtonLink>
                      <Button
                        variant="ghost"
                        size="sm"
                        isLoading={vm.busy === `duplicate-${event.id}`}
                        onClick={() => void vm.onDuplicate(event)}
                      >
                        Duplicate
                      </Button>
                      {event.status !== "cancelled" ? (
                        <Button variant="ghost" size="sm" onClick={() => vm.setCancelTarget(event)}>
                          Cancel
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={event.sold > 0}
                        title={event.sold > 0 ? "Events with tickets can't be deleted. Cancel instead." : undefined}
                        onClick={() => vm.setDeleteTarget(event)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={vm.filters.page}
            pageSize={EVENTS_PAGE_SIZE}
            total={data.total}
            onPageChange={(page) => vm.updateFilter("page", page)}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={vm.cancelTarget !== null}
        title={`Cancel "${vm.cancelTarget?.title ?? ""}"?`}
        description="The event is marked cancelled, all active tickets are cancelled and every ticket holder gets a notification. This can't be undone."
        confirmLabel="Cancel event"
        isLoading={vm.busy === "cancel"}
        onConfirm={() => void vm.confirmCancel()}
        onCancel={() => vm.setCancelTarget(null)}
      >
        <Field label="Message to ticket holders (optional)">
          {(props) => (
            <Textarea
              {...props}
              maxLength={500}
              value={vm.cancelReason}
              onChange={(event) => vm.setCancelReason(event.target.value)}
              placeholder="e.g. Refunds will be processed within 5 days."
            />
          )}
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={vm.deleteTarget !== null}
        title={`Delete "${vm.deleteTarget?.title ?? ""}"?`}
        description="This permanently removes the event. Only events without tickets can be deleted."
        confirmLabel="Delete event"
        isLoading={vm.busy === "delete"}
        onConfirm={() => void vm.confirmDelete()}
        onCancel={() => vm.setDeleteTarget(null)}
      />
    </>
  );
}
