"use client";

import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { TicketStub } from "@/features/tickets/view/TicketStub";
import { useTicketDetail } from "@/features/tickets/viewmodel/useTicketDetail";

export default function TicketDetailScreen({ code, holderName }: { code: string; holderName: string }) {
  const vm = useTicketDetail(code, holderName);
  const { data: ticket, error, isLoading } = vm.ticket;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <Link href="/tickets" className="justify-self-start text-sm font-semibold text-muted hover:text-fg">
        ← My tickets
      </Link>

      {error ? (
        <div role="alert" className="grid justify-items-start gap-3 rounded-lg border border-danger/40 bg-danger-bg p-5 text-danger">
          <p className="font-semibold">Couldn&apos;t load this ticket.</p>
          <Button variant="secondary" size="sm" onClick={() => void vm.ticket.reload()}>
            Try again
          </Button>
        </div>
      ) : isLoading && !ticket ? (
        <div role="status" aria-label="Loading ticket" className="grid gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-12" />
        </div>
      ) : !ticket ? (
        <EmptyState
          icon="🎟"
          title="Ticket not found"
          description="This ticket doesn't exist or belongs to another account."
          action={<ButtonLink href="/tickets">Go to my tickets</ButtonLink>}
        />
      ) : (
        <>
          <TicketStub
            ticket={ticket}
            size="large"
            footer={
              <p className="mt-3 text-sm text-muted">
                {ticket.phase === "upcoming"
                  ? "Show this QR code at the entrance. Screen brightness up helps the scanner."
                  : ticket.phase === "used" && ticket.checkedInAt
                    ? <>Checked in <LocalDateTime iso={ticket.checkedInAt} format="dateTime" />.</>
                    : ticket.eventCancelled
                      ? "This event was cancelled, so your ticket can no longer be used."
                      : ticket.phase === "cancelled"
                        ? "This ticket was cancelled and can't be used."
                        : "This event has ended."}
              </p>
            }
          />

          <section aria-label="Ticket actions" className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void vm.downloadPng()} isLoading={vm.busy === "png"}>
              Download PNG
            </Button>
            <Button variant="secondary" onClick={() => void vm.downloadPdf()} isLoading={vm.busy === "pdf"}>
              Download PDF
            </Button>
            {ticket.event ? (
              <>
                <Button variant="secondary" onClick={() => void vm.share()} isLoading={vm.busy === "share"}>
                  Share
                </Button>
                {ticket.phase === "upcoming" ? (
                  <Button variant="secondary" onClick={vm.addToCalendar}>
                    Add to calendar
                  </Button>
                ) : null}
                <ButtonLink href={`/events/${ticket.event.slug}`} variant="ghost">
                  View event
                </ButtonLink>
              </>
            ) : null}
            {ticket.canCancel ? (
              <Button variant="danger" className="sm:ml-auto" onClick={() => vm.setConfirmCancel(true)}>
                Cancel ticket
              </Button>
            ) : null}
          </section>

          <ConfirmDialog
            open={vm.confirmCancel}
            title="Cancel this ticket?"
            description="Your ticket will stop working and your seat is released. This can't be undone."
            confirmLabel="Cancel ticket"
            isLoading={vm.busy === "cancel"}
            onConfirm={() => void vm.cancel()}
            onCancel={() => vm.setConfirmCancel(false)}
          />
        </>
      )}
    </div>
  );
}
