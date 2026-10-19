"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { Field, Select } from "@/components/ui/Field";
import { formatPrice } from "@/lib/format";
import { typeAvailability, type PublicTicketType, type TypeAvailability } from "@/features/events/model/ticketAvailability";
import { useTicketSelection } from "@/features/events/viewmodel/useTicketSelection";

type Props = {
  types: PublicTicketType[];
  perPerson: number;
  slug: string;
  isSignedIn: boolean;
  // Tickets the viewer already holds for this event.
  alreadyBooked?: number;
  // Event-level reason booking isn't possible (ended, cancelled, …).
  unavailableReason: string | null;
  // Organizer/admin preview: everything visible, booking disabled.
  preview?: boolean;
};

function AvailabilityNote({ availability }: { availability: TypeAvailability }) {
  switch (availability.state) {
    case "sold_out":
      return <Badge tone="danger">Sold out</Badge>;
    case "ended":
      return <Badge tone="neutral">Sales ended</Badge>;
    case "not_started":
      return (
        <Badge tone="neutral">
          On sale <LocalDateTime iso={availability.startsAt} format="dayMonth" />
        </Badge>
      );
    case "on_sale":
      return availability.lowStock ? <Badge tone="accent">Only {availability.left} left</Badge> : null;
  }
}

// Why an option can't be picked, shown in the dropdown.
function unavailableLabel(availability: TypeAvailability): string {
  switch (availability.state) {
    case "sold_out":
      return " (sold out)";
    case "ended":
      return " (sales ended)";
    case "not_started":
      return " (not on sale yet)";
    case "on_sale":
      return "";
  }
}

// Button text when no ticket type can be booked right now.
function noneAvailableLabel(availabilities: TypeAvailability[]): string {
  if (availabilities.some((availability) => availability.state === "not_started")) return "Not on sale yet";
  if (availabilities.every((availability) => availability.state === "ended")) return "Sales ended";
  return "Sold out";
}

// Booking panel: choose a ticket type and quantity, see the total, book.
export function TicketSelector({
  types,
  perPerson,
  slug,
  isSignedIn,
  alreadyBooked = 0,
  unavailableReason,
  preview = false,
}: Props) {
  const vm = useTicketSelection({ types, perPerson, slug, isSignedIn, alreadyBooked });
  const limitReached = isSignedIn && vm.remaining === 0;
  const blocked = preview || Boolean(unavailableReason) || limitReached;

  if (types.length === 0) {
    return (
      <Button size="lg" disabled className="w-full">
        {unavailableReason ?? "Tickets aren't on sale yet"}
      </Button>
    );
  }

  return (
    <div className="grid gap-4">
      <Field label="Ticket type">
        {(props) => (
          <Select {...props} value={vm.selectedId ?? ""} onChange={(event) => vm.select(event.target.value)}>
            {!vm.selected ? <option value="">Select a ticket type</option> : null}
            {types.map((type) => {
              const availability = typeAvailability(type, vm.now);
              return (
                <option key={type.id} value={type.id} disabled={availability.state !== "on_sale"}>
                  {`${type.name} · ${formatPrice(type.price)}${unavailableLabel(availability)}`}
                </option>
              );
            })}
          </Select>
        )}
      </Field>

      {vm.selected ? (
        <div className="grid gap-1 rounded-lg border border-accent bg-accent/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <span className="font-semibold">{vm.selected.name}</span>
            <span className="font-bold tabular-nums">{formatPrice(vm.selected.price)}</span>
          </div>
          {vm.selected.description ? <span className="text-xs text-muted">{vm.selected.description}</span> : null}
          <AvailabilityNote availability={typeAvailability(vm.selected, vm.now)} />
        </div>
      ) : null}

      {vm.selected && vm.max > 0 && !blocked ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold" id={`quantity-${slug}`}>
            Quantity
          </span>
          <div role="group" aria-labelledby={`quantity-${slug}`} className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={vm.decrement} disabled={vm.quantity <= 1} aria-label="One fewer ticket">
              −
            </Button>
            <span aria-live="polite" className="w-8 text-center text-lg font-bold tabular-nums">
              {vm.quantity}
            </span>
            <Button variant="secondary" size="sm" onClick={vm.increment} disabled={vm.quantity >= vm.max} aria-label="One more ticket">
              +
            </Button>
          </div>
        </div>
      ) : null}

      {vm.selected ? (
        <>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm text-muted">Total</span>
            <span className="text-2xl font-extrabold tabular-nums">{formatPrice(vm.total)}</span>
          </div>
          <p className="-mt-2 text-xs text-muted">
            Up to {perPerson} tickets per person for this event.
            {isSignedIn && alreadyBooked > 0 ? ` You have ${alreadyBooked}.` : ""}
          </p>
        </>
      ) : null}

      {preview ? (
        <p className="rounded-md bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-muted">
          Booking opens once your event is approved
        </p>
      ) : unavailableReason ? (
        <Button size="lg" disabled className="w-full">
          {unavailableReason}
        </Button>
      ) : limitReached ? (
        <div className="grid gap-2">
          <Button size="lg" disabled className="w-full">
            Ticket limit reached
          </Button>
          <p role="status" className="text-center text-sm text-muted">
            You already have {alreadyBooked} ticket{alreadyBooked === 1 ? "" : "s"} for this event.{" "}
            <Link href="/tickets" className="font-semibold text-accent-text hover:underline">
              View my tickets
            </Link>
          </p>
        </div>
      ) : !vm.selected ? (
        <Button size="lg" disabled className="w-full">
          {noneAvailableLabel(types.map((type) => typeAvailability(type, vm.now)))}
        </Button>
      ) : (
        <Button size="lg" className="w-full" isLoading={vm.isBooking} onClick={() => void vm.book()}>
          {isSignedIn ? (vm.quantity === 1 ? "Book ticket" : `Book ${vm.quantity} tickets`) : "Log in to book"}
        </Button>
      )}
    </div>
  );
}
