import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { cn } from "@/lib/cn";
import type { TicketPhase, TicketView } from "@/features/tickets/model/tickets.types";
import { TicketQr } from "@/features/tickets/view/TicketQr";

const PHASE_BADGE: Record<TicketPhase, { label: string; tone: "success" | "neutral" | "danger" }> = {
  upcoming: { label: "Valid", tone: "success" },
  used: { label: "Used", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  past: { label: "Event ended", tone: "neutral" },
};

export function TicketPhaseBadge({ phase }: { phase: TicketPhase }) {
  const badge = PHASE_BADGE[phase];
  return <Badge tone={badge.tone}>{badge.label}</Badge>;
}

type TicketStubProps = {
  ticket: TicketView;
  size?: "compact" | "large";
  footer?: ReactNode;
};

// A ticket with a perforated divider: event info on the left, QR stub on the right.
export function TicketStub({ ticket, size = "compact", footer }: TicketStubProps) {
  const large = size === "large";
  const qrSize = large ? 200 : 104;
  const inactive = ticket.phase !== "upcoming";
  const title = ticket.event?.title ?? "Event removed";

  return (
    <article
      className={cn(
        "relative grid overflow-hidden rounded-xl border border-border bg-surface",
        large ? "md:grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto]"
      )}
    >
      {/* Accent edge */}
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", inactive ? "bg-border" : "bg-accent")} />

      <div className={cn("grid content-start gap-2", large ? "p-6 pl-8 sm:p-8 sm:pl-10" : "p-4 pl-6")}>
        <div className="flex flex-wrap items-center gap-2">
          {ticket.eventCancelled ? <Badge tone="danger">Event cancelled</Badge> : <TicketPhaseBadge phase={ticket.phase} />}
          {ticket.ticketTypeName ? (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">{ticket.ticketTypeName}</span>
          ) : null}
        </div>
        <h2 className={cn("font-extrabold leading-tight", large ? "text-3xl" : "text-lg")}>
          {large || !ticket.event ? (
            title
          ) : (
            <Link href={`/tickets/${ticket.code}`} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none">
              {title}
            </Link>
          )}
        </h2>
        {ticket.event ? (
          <dl className={cn("grid gap-x-6 gap-y-1", large ? "mt-2 gap-y-3 sm:grid-cols-2" : "text-sm")}>
            <div>
              <dt className={large ? "text-xs font-bold uppercase tracking-wider text-muted" : "sr-only"}>Date</dt>
              <dd className="font-semibold">
                <LocalDateTime iso={ticket.event.startsAt} format={large ? "weekdayDate" : "dateTime"} />
              </dd>
            </div>
            {large ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-muted">Time</dt>
                <dd className="font-semibold">
                  <LocalDateTime iso={ticket.event.startsAt} format="time" />
                </dd>
              </div>
            ) : null}
            <div className={large ? "sm:col-span-2" : undefined}>
              <dt className={large ? "text-xs font-bold uppercase tracking-wider text-muted" : "sr-only"}>Venue</dt>
              <dd className="truncate text-muted">{ticket.event.location}</dd>
            </div>
          </dl>
        ) : null}
        {footer}
      </div>

      {/* Perforated stub */}
      <div
        className={cn(
          "relative grid place-items-center gap-2 border-dashed border-border",
          large ? "border-t-2 p-6 md:border-l-2 md:border-t-0 md:px-10" : "border-l-2 p-4"
        )}
      >
        {/* Notches where the stub tears off */}
        <span aria-hidden className="absolute -left-3 -top-3 size-6 rounded-full bg-bg" />
        <span
          aria-hidden
          className={cn(
            "absolute size-6 rounded-full bg-bg",
            large ? "-right-3 -top-3 md:-bottom-3 md:-left-3 md:right-auto md:top-auto" : "-bottom-3 -left-3"
          )}
        />
        <TicketQr code={ticket.code} size={qrSize} dimmed={inactive} />
        <p className={cn("font-mono font-bold tracking-[0.2em]", large ? "text-base" : "text-[11px]")}>{ticket.code}</p>
      </div>
    </article>
  );
}
