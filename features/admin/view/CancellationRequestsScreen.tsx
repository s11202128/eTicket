"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Textarea } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { EventStatusBadge } from "@/features/admin/view/StatusBadges";
import { useCancellationRequests } from "@/features/admin/viewmodel/useCancellationRequests";

export default function CancellationRequestsScreen() {
  const vm = useCancellationRequests();

  return (
    <>
      <PageHeader
        title="Cancellation requests"
        description="Organizers ask to cancel; cancelling here cancels every ticket and notifies the holders."
      />
      {vm.error ? (
        <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
      ) : vm.isLoading ? (
        <SkeletonRows rows={4} label="Loading requests" />
      ) : vm.requests.length === 0 ? (
        <EmptyState icon="🗓" title="No cancellation requests" />
      ) : (
        <ul className="grid gap-4">
          {vm.requests.map((request) => (
            <li key={request.id}>
              <Card className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="grid gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/events/${request.slug}`} target="_blank" className="font-bold hover:underline">
                      {request.title}
                    </Link>
                    <EventStatusBadge status={request.status} />
                  </div>
                  <p className="text-sm text-muted">
                    <LocalDateTime iso={request.startsAt} /> · {request.sold} ticket{request.sold === 1 ? "" : "s"} sold
                  </p>
                  <p className="text-sm text-muted">
                    {request.organizer
                      ? `${request.organizer.organizationName} · ${request.organizer.email ?? ""}`
                      : "Platform event"}
                    {request.requestedAt ? (
                      <>
                        {" · requested "}
                        <LocalDateTime iso={request.requestedAt} />
                      </>
                    ) : null}
                  </p>
                  <blockquote className="rounded-md bg-surface-2 p-3 text-sm whitespace-pre-line">
                    {request.reason || "No reason given."}
                  </blockquote>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col">
                  <Button variant="danger" onClick={() => vm.start("cancel", request)}>
                    Cancel event
                  </Button>
                  <Button variant="secondary" onClick={() => vm.start("decline", request)}>
                    Decline
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {vm.action ? (
        <ConfirmDialog
          open
          title={vm.action.kind === "cancel" ? "Cancel this event?" : "Decline the request?"}
          description={
            vm.action.kind === "cancel" ? (
              <>
                <strong className="text-fg">{vm.action.request.title}</strong>: all {vm.action.request.sold} tickets are cancelled
                and every holder is notified. This can&apos;t be undone.
              </>
            ) : (
              <>
                <strong className="text-fg">{vm.action.request.title}</strong> stays on sale. The organizer sees your note.
              </>
            )
          }
          confirmLabel={vm.action.kind === "cancel" ? "Cancel event" : "Decline request"}
          tone={vm.action.kind === "cancel" ? "danger" : "primary"}
          isLoading={vm.isWorking}
          onConfirm={() => void vm.confirm()}
          onCancel={vm.close}
        >
          <Field
            label={vm.action.kind === "cancel" ? "Message to ticket holders" : "Note to the organizer"}
            required={vm.action.kind === "decline"}
            error={vm.noteError ?? undefined}
          >
            {(props) => <Textarea {...props} rows={3} maxLength={1000} value={vm.note} onChange={(event) => vm.setNote(event.target.value)} />}
          </Field>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
