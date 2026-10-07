"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { typeAvailability, type PublicTicketType, type TypeAvailability } from "@/features/events/model/ticketAvailability";
import { useTicketSelection } from "@/features/events/viewmodel/useTicketSelection";

type Props = {
  types: PublicTicketType[];
  perPerson: number;
  slug: string;
  isSignedIn: boolean;
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

// Booking panel: choose a ticket type and quantity, see the total, book.
export function TicketSelector({ types, perPerson, slug, isSignedIn, unavailableReason, preview = false }: Props) {
  const vm = useTicketSelection({ types, perPerson, slug, isSignedIn });
  const blocked = preview || Boolean(unavailableReason);

  if (types.length === 0) {
    return (
      <Button size="lg" disabled className="w-full">
        {unavailableReason ?? "Tickets aren't on sale yet"}
      </Button>
    );
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Tickets</legend>
        {types.map((type) => {
          const availability = typeAvailability(type, vm.now);
          const available = availability.state === "on_sale";
          const checked = vm.selectedId === type.id;
          return (
            <label
              key={type.id}
              className={cn(
                "grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border p-3 transition-colors",
                checked ? "border-accent bg-accent/10" : "border-border hover:border-muted",
                (!available || blocked) && "cursor-not-allowed opacity-70"
              )}
            >
              <input
                type="radio"
                name={`ticket-type-${slug}`}
                className="mt-1 accent-[var(--accent)]"
                checked={checked}
                disabled={!available || blocked}
                onChange={() => vm.select(type.id)}
              />
              <span className="grid gap-1">
                <span className="font-semibold">{type.name}</span>
                {type.description ? <span className="text-xs text-muted">{type.description}</span> : null}
                <AvailabilityNote availability={availability} />
              </span>
              <span className="font-bold tabular-nums">{formatPrice(type.price)}</span>
            </label>
          );
        })}
      </fieldset>

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

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm text-muted">Total</span>
        <span className="text-2xl font-extrabold tabular-nums">{formatPrice(vm.total)}</span>
      </div>
      <p className="-mt-2 text-xs text-muted">Up to {perPerson} tickets per person for this event.</p>

      {preview ? (
        <p className="rounded-md bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-muted">
          Booking opens once your event is approved
        </p>
      ) : unavailableReason ? (
        <Button size="lg" disabled className="w-full">
          {unavailableReason}
        </Button>
      ) : !vm.selected ? (
        <Button size="lg" disabled className="w-full">
          Sold out
        </Button>
      ) : (
        <Button size="lg" className="w-full" isLoading={vm.isBooking} onClick={() => void vm.book()}>
          {isSignedIn ? (vm.quantity === 1 ? "Book ticket" : `Book ${vm.quantity} tickets`) : "Log in to book"}
        </Button>
      )}
    </div>
  );
}
