"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import { formatPrice } from "@/lib/format";
import { ErrorState, PageHeader, StatCard } from "@/features/admin/view/AdminUi";
import { EventStatusBadge, TicketStatusBadge } from "@/features/admin/view/StatusBadges";
import { editMode, eventHasEnded } from "@/features/manager/model/eventTabs";
import { SalesChart } from "@/features/manager/view/SalesChart";
import { useManagerEvent, type ManagerEventViewModel } from "@/features/manager/viewmodel/useManagerEvent";

export default function ManagerEventScreen({ eventId }: { eventId: string }) {
  const vm = useManagerEvent(eventId);

  if (vm.error) return <ErrorState message={vm.error} onRetry={() => void vm.reload()} />;
  if (vm.isLoading) return <SkeletonRows rows={8} label="Loading event" />;
  if (!vm.data || !vm.stats) {
    return <ErrorState message="Event not found, or it isn't yours." />;
  }

  const { meta, ticketTypes, staff } = vm.data;
  const stats = vm.stats;

  return (
    <>
      <div className="grid gap-2">
        <Link href="/manager/events" className="text-sm font-semibold text-muted hover:text-fg">
          ← My Events
        </Link>
        <PageHeader title={meta.title} actions={<EventActions vm={vm} />} />
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <EventStatusBadge status={meta.status} />
          <span>
            <LocalDateTime iso={meta.startsAt} /> · {meta.location}
          </span>
          {meta.cancellationRequested ? <span className="font-semibold text-danger">Cancellation requested</span> : null}
        </div>
      </div>

      <ReviewNote vm={vm} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tickets sold"
          value={stats.capacity === null ? stats.sold : `${stats.sold} / ${stats.capacity}`}
          hint={stats.cancelled ? `${stats.cancelled} cancelled` : undefined}
        />
        <StatCard label="Gross sales" value={formatPrice(stats.gross)} hint="At current ticket prices" />
        <StatCard label="Checked in" value={`${stats.checkedIn} / ${stats.sold}`} />
        <StatCard label="Door staff" value={staff.length} hint={staff.length ? undefined : "Add people on the Team page"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="grid content-start gap-4">
          <CardTitle>Sales over time</CardTitle>
          <SalesChart points={stats.series} />
        </Card>
        <Card className="grid content-start gap-4">
          <CardTitle>Ticket types</CardTitle>
          <ul className="grid gap-3">
            {ticketTypes.map((type) => (
              <li key={type.id} className="grid gap-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold">{type.name}</span>
                  <span className="tabular-nums text-muted">
                    {formatPrice(type.price)} · {type.sold}
                    {type.quantity === null ? " sold" : ` / ${type.quantity}`}
                  </span>
                </div>
                {type.quantity !== null ? (
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-accent" style={{ width: `${Math.min(type.sold / type.quantity, 1) * 100}%` }} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="grid gap-1 border-t border-border pt-4">
            <p className="text-sm font-semibold">
              Check-in progress: {stats.checkedIn} / {stats.sold}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-success" style={{ width: `${stats.sold ? (stats.checkedIn / stats.sold) * 100 : 0}%` }} />
            </div>
            {meta.status === "published" ? (
              <ButtonLink href={`/manager/check-in?event=${meta.id}`} variant="secondary" size="sm" className="mt-2 justify-self-start">
                Open scanner
              </ButtonLink>
            ) : null}
          </div>
        </Card>
      </div>

      <Attendees vm={vm} />

      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Door staff</CardTitle>
          <Link href={`/manager/team?event=${meta.id}`} className="text-sm font-semibold text-accent-text hover:underline">
            Manage team
          </Link>
        </div>
        {staff.length === 0 ? (
          <p className="text-sm text-muted">Nobody yet. Door staff can scan tickets for this event only.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {staff.map((member) => (
              <li key={member.userId}>
                <span className="font-semibold">{member.name || member.email}</span>
                {member.name ? <span className="text-muted"> · {member.email}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ReviewNote({ vm }: { vm: ManagerEventViewModel }) {
  const meta = vm.data!.meta;
  if (meta.status === "pending_review") {
    return (
      <p role="status" className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Waiting for approval{meta.submittedAt ? " since " : ""}
        {meta.submittedAt ? <LocalDateTime iso={meta.submittedAt} /> : null}. We&apos;ll notify you when it&apos;s reviewed.
      </p>
    );
  }
  if ((meta.status === "changes_requested" || meta.status === "rejected") && meta.reviewNote) {
    return (
      <div role="note" className="rounded-lg border border-warning/40 bg-warning-bg p-4">
        <p className="text-sm font-bold text-warning">{meta.status === "rejected" ? "Rejected" : "Changes requested"}</p>
        <p className="mt-1 whitespace-pre-line text-sm text-fg">{meta.reviewNote}</p>
      </div>
    );
  }
  if (meta.status === "cancelled") {
    return (
      <p role="status" className="rounded-lg border border-danger/40 bg-danger-bg p-4 text-sm font-semibold text-danger">
        This event was cancelled. All tickets were cancelled and holders were notified.
      </p>
    );
  }
  return null;
}

function EventActions({ vm }: { vm: ManagerEventViewModel }) {
  const meta = vm.data!.meta;
  const [askCancel, setAskCancel] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [reason, setReason] = useState("");
  const mode = editMode(meta.status);
  const canRequestCancel =
    meta.status === "published" && !meta.cancellationRequested && !eventHasEnded(meta, new Date());

  return (
    <>
      {meta.status === "published" ? (
        <ButtonLink href={`/events/${meta.slug}`} variant="ghost" target="_blank">
          View public page
        </ButtonLink>
      ) : null}
      {mode !== "locked" ? (
        <ButtonLink href={`/manager/events/${meta.id}/edit`} variant="secondary">
          Edit
        </ButtonLink>
      ) : null}
      {mode === "draft" ? (
        <Button onClick={() => void vm.submit()} isLoading={vm.busy === "submit"}>
          Submit for approval
        </Button>
      ) : null}
      {meta.status === "draft" ? (
        <Button variant="danger" onClick={() => setAskDelete(true)}>
          Delete draft
        </Button>
      ) : null}
      {canRequestCancel ? (
        <Button variant="danger" onClick={() => setAskCancel(true)}>
          Request cancellation
        </Button>
      ) : null}

      <ConfirmDialog
        open={askDelete}
        title="Delete this draft?"
        description="The draft and its ticket types are removed. This can't be undone."
        confirmLabel="Delete draft"
        isLoading={vm.busy === "delete"}
        onConfirm={() => void vm.deleteDraft()}
        onCancel={() => setAskDelete(false)}
      />
      <ConfirmDialog
        open={askCancel}
        title="Request cancellation"
        description="Our team reviews the request, cancels the event and notifies every ticket holder."
        confirmLabel="Send request"
        isLoading={vm.busy === "cancel"}
        onConfirm={() => {
          if (reason.trim().length < 5) return;
          void vm.requestCancellation(reason.trim()).then((done) => {
            if (done) {
              setAskCancel(false);
              setReason("");
            }
          });
        }}
        onCancel={() => setAskCancel(false)}
      >
        <Field label="Reason" required hint="Shown to our team. At least 5 characters.">
          {(props) => <Textarea {...props} rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />}
        </Field>
      </ConfirmDialog>
    </>
  );
}

function Attendees({ vm }: { vm: ManagerEventViewModel }) {
  const { ticketTypes } = vm.data!;
  return (
    <section aria-labelledby="attendees-heading" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="attendees-heading" className="text-lg font-bold">
          Attendees <span className="font-normal text-muted">({vm.attendees.length})</span>
        </h2>
        <Button variant="secondary" size="sm" onClick={vm.exportCsv} disabled={vm.attendees.length === 0}>
          Export CSV
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Search">
          {(props) => (
            <Input
              {...props}
              type="search"
              placeholder="Name, email or code"
              value={vm.filter.query}
              onChange={(event) => vm.setFilter({ ...vm.filter, query: event.target.value })}
            />
          )}
        </Field>
        <Field label="Ticket type">
          {(props) => (
            <Select {...props} value={vm.filter.ticketTypeId} onChange={(event) => vm.setFilter({ ...vm.filter, ticketTypeId: event.target.value })}>
              <option value="">All types</option>
              {ticketTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Check-in">
          {(props) => (
            <Select
              {...props}
              value={vm.filter.checkIn}
              onChange={(event) => vm.setFilter({ ...vm.filter, checkIn: event.target.value as "" | "in" | "out" })}
            >
              <option value="">Everyone</option>
              <option value="in">Checked in</option>
              <option value="out">Not checked in</option>
            </Select>
          )}
        </Field>
      </div>
      {vm.attendees.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
          {vm.data!.attendees.length === 0 ? "No bookings yet." : "No attendees match these filters."}
        </p>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Ticket</Th>
              <Th>Code</Th>
              <Th>Status</Th>
              <Th>Booked</Th>
              <Th>Checked in</Th>
            </tr>
          </THead>
          <TBody>
            {vm.attendees.map((ticket) => (
              <tr key={ticket.ticketId}>
                <Td>
                  <span className="block font-semibold">{ticket.holderName || "Guest"}</span>
                  <span className="block text-xs text-muted">{ticket.holderEmail}</span>
                </Td>
                <Td>{ticket.ticketTypeName}</Td>
                <Td className="font-mono text-xs">{ticket.code}</Td>
                <Td>
                  <TicketStatusBadge status={ticket.status} />
                </Td>
                <Td className="whitespace-nowrap text-xs">
                  <LocalDateTime iso={ticket.bookedAt} />
                </Td>
                <Td className="whitespace-nowrap text-xs">{ticket.checkedInAt ? <LocalDateTime iso={ticket.checkedInAt} format="time" /> : "—"}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}
