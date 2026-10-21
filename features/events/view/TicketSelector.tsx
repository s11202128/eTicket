"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatPrice } from "@/lib/format";
import { typeAvailability, type PublicTicketType, type TypeAvailability } from "@/features/events/model/ticketAvailability";
import { maxAddonQuantity, type PublicAddon } from "@/features/events/model/addonAvailability";
import { useTicketSelection } from "@/features/events/viewmodel/useTicketSelection";
import type { PaymentSettings } from "@/features/payments/model/payments.types";

type Props = {
  types: PublicTicketType[];
  addons: PublicAddon[];
  perPerson: number;
  eventId: string;
  slug: string;
  // Event-level reason booking isn't possible (ended, cancelled, …).
  unavailableReason: string | null;
  payment: PaymentSettings;
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
  addons,
  perPerson,
  eventId,
  slug,
  unavailableReason,
  payment,
  preview = false,
}: Props) {
  const vm = useTicketSelection({
    types,
    addons,
    perPerson,
    eventId,
    slug,
    serviceFeePercent: payment.serviceFeePercent,
    preview,
  });
  const { quote } = vm;
  const { isSignedIn, alreadyBooked } = vm;
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

      {vm.selected && addons.length > 0 && !blocked ? (
        <fieldset className="grid gap-2 border-t border-border pt-3">
          <legend className="mb-1 text-sm font-semibold">Extras</legend>
          {addons.map((addon) => {
            const max = maxAddonQuantity(addon);
            const count = vm.addonQuantities[addon.id] ?? 0;
            return (
              <div key={addon.id} className="flex items-center justify-between gap-3">
                <div className="grid min-w-0">
                  <span className="text-sm font-medium">
                    {addon.name} <span className="text-muted">· {formatPrice(addon.price)}</span>
                  </span>
                  {addon.description ? <span className="text-xs text-muted">{addon.description}</span> : null}
                  {max === 0 ? <span className="text-xs font-semibold text-danger">Sold out</span> : null}
                </div>
                <div role="group" aria-label={`${addon.name} quantity`} className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => vm.setAddonQuantity(addon.id, count - 1)}
                    disabled={count <= 0}
                    aria-label={`One fewer ${addon.name}`}
                  >
                    −
                  </Button>
                  <span aria-live="polite" className="w-6 text-center font-bold tabular-nums">
                    {count}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => vm.setAddonQuantity(addon.id, count + 1)}
                    disabled={count >= max}
                    aria-label={`One more ${addon.name}`}
                  >
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </fieldset>
      ) : null}

      {vm.selected && !blocked && vm.selected.price > 0 ? (
        vm.promo ? (
          <div className="flex items-center justify-between gap-3 rounded-md bg-success-bg px-3 py-2 text-sm">
            <span>
              <span className="font-mono font-semibold">{vm.promo.code}</span> applied
            </span>
            <button type="button" onClick={vm.removePromo} className="font-semibold text-accent-text hover:underline">
              Remove
            </button>
          </div>
        ) : (
          <details className="group text-sm" open={Boolean(vm.promoInput || vm.promoError) || undefined}>
            <summary className="cursor-pointer font-semibold text-accent-text">Have a promo code?</summary>
            <form
              className="mt-2 flex items-start gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void vm.applyPromo();
              }}
            >
              <div className="grid flex-1 gap-1">
                <Input
                  aria-label="Promo code"
                  value={vm.promoInput}
                  onChange={(event) => vm.setPromoInput(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="font-mono uppercase"
                  aria-invalid={vm.promoError ? true : undefined}
                  aria-describedby={vm.promoError ? `promo-error-${slug}` : undefined}
                />
                {vm.promoError ? (
                  <span id={`promo-error-${slug}`} role="alert" className="text-xs font-medium text-danger">
                    {vm.promoError}
                  </span>
                ) : null}
              </div>
              <Button type="submit" variant="secondary" isLoading={vm.isCheckingPromo} disabled={!vm.promoInput.trim()}>
                Apply
              </Button>
            </form>
          </details>
        )
      ) : null}

      {vm.selected ? (
        <>
          <dl className="grid gap-1 border-t border-border pt-3">
            {quote.subtotal !== quote.total ? (
              <div className="flex justify-between text-sm text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(quote.subtotal)}</dd>
              </div>
            ) : null}
            {quote.discount > 0 ? (
              <div className="flex justify-between text-sm text-success">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{formatPrice(quote.discount)}</dd>
              </div>
            ) : null}
            {quote.serviceFee > 0 ? (
              <div className="flex justify-between text-sm text-muted">
                <dt>Service fee ({payment.serviceFeePercent}%)</dt>
                <dd className="tabular-nums">{formatPrice(quote.serviceFee)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-muted">Total</dt>
              <dd className="text-2xl font-extrabold tabular-nums">{formatPrice(quote.total)}</dd>
            </div>
          </dl>
          <p className="-mt-2 text-xs text-muted">
            Up to {perPerson} tickets per person for this event.
            {isSignedIn && alreadyBooked > 0 ? ` You have ${alreadyBooked}.` : ""}
          </p>
          {payment.mode === "test" && quote.total > 0 && !preview ? (
            <p role="note" className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">
              <span className="font-semibold text-fg">Test mode:</span> online payment isn&apos;t set up yet, so
              tickets are issued without charging you.
            </p>
          ) : null}
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
        // Waits for the sign-in check so "Log in to book" doesn't flash for signed-in visitors.
        <Button size="lg" className="w-full" isLoading={vm.isBooking || !vm.viewerReady} onClick={() => void vm.book()}>
          {isSignedIn || !vm.viewerReady
            ? vm.quantity === 1
              ? "Book ticket"
              : `Book ${vm.quantity} tickets`
            : "Log in to book"}
        </Button>
      )}
    </div>
  );
}
