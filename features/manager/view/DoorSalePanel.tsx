"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { ErrorState } from "@/features/admin/view/AdminUi";
import { TicketQr } from "@/features/tickets/view/TicketQr";
import { DOOR_NAME_MAX_LENGTH, DOOR_PAYMENT_METHODS, ticketsLabel } from "@/features/manager/model/doorSale";
import {
  useDoorSale,
  useDoorSalesHistory,
  type DoorSale,
  type DoorSaleHistoryItem,
  type DoorSalesHistoryViewModel,
} from "@/features/manager/viewmodel/useDoorSale";

type Props = { eventId: string; startsAt: string | null; onSold: () => void };

// Point of sale at the gate. Card and mobile money are taken on the
// organizer's own terminal or phone; the app only records how they paid.
export function DoorSalePanel({ eventId, startsAt, onSold }: Props) {
  const history = useDoorSalesHistory(eventId);
  const vm = useDoorSale({
    eventId,
    startsAt,
    onSold: () => {
      onSold();
      void history.reload();
    },
  });

  if (vm.typesError) return <ErrorState message={vm.typesError} onRetry={() => void vm.reloadTypes()} />;
  if (vm.typesLoading && vm.ticketTypes.length === 0) return <SkeletonRows rows={3} label="Loading ticket types" />;
  if (vm.ticketTypes.length === 0) {
    return <EmptyState icon="🎟" title="No ticket types" description="This event has no tickets to sell." />;
  }

  return (
    <div className="grid gap-4">
      {/* Kept mounted so screen readers announce each sale. */}
      <p aria-live="polite" className="sr-only">
        {vm.sale ? `Sold ${ticketsLabel(vm.sale.tickets.length)} to ${vm.sale.holderName}.` : ""}
      </p>
      {vm.sale ? (
        <SaleResult sale={vm.sale} onNext={vm.nextBuyer} />
      ) : (
        <form
          className="grid gap-4 rounded-lg border border-border bg-surface p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void vm.submit();
          }}
        >
          {vm.ticketType ? (
            <>
              <Field label="Ticket type">
                {(props) => (
                  <Select {...props} className="h-12 text-base" value={vm.ticketType?.id} onChange={(event) => vm.chooseType(event.target.value)}>
                    {vm.ticketTypes.map((type) => (
                      <option key={type.id} value={type.id} disabled={type.seatsLeft === 0}>
                        {type.name} · {formatPrice(type.price)}
                        {type.seatsLeft === 0 ? " · Sold out" : type.seatsLeft !== null ? ` · ${type.seatsLeft} left` : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Quantity" hint={`Up to ${vm.maxQuantity} per sale.`}>
                {(props) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-14 px-0 text-2xl"
                      aria-label="One less"
                      onClick={() => vm.setQuantity(vm.quantity - 1)}
                      disabled={vm.quantity <= 1}
                    >
                      −
                    </Button>
                    <Input
                      {...props}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={vm.maxQuantity}
                      value={vm.quantity}
                      onChange={(event) => vm.setQuantity(Number(event.target.value))}
                      className="h-14 text-center text-2xl font-bold tabular-nums"
                    />
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-14 px-0 text-2xl"
                      aria-label="One more"
                      onClick={() => vm.setQuantity(vm.quantity + 1)}
                      disabled={vm.quantity >= vm.maxQuantity}
                    >
                      +
                    </Button>
                  </div>
                )}
              </Field>

              <Field label="Buyer's name" required error={vm.nameError ?? undefined}>
                {(props) => (
                  <Input
                    {...props}
                    value={vm.holderName}
                    onChange={(event) => vm.setHolderName(event.target.value)}
                    maxLength={DOOR_NAME_MAX_LENGTH}
                    autoComplete="off"
                    autoCapitalize="words"
                    className="h-14 text-lg"
                    placeholder="Name on the ticket"
                  />
                )}
              </Field>

              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-sm font-semibold">Payment</legend>
                <div className="grid grid-cols-2 gap-2">
                  {DOOR_PAYMENT_METHODS.map((method) => {
                    const checked = vm.paymentMethod === method.id;
                    return (
                      <label
                        key={method.id}
                        className={cn(
                          "flex h-14 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-base font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
                          checked ? "border-accent bg-accent text-on-accent" : "border-border bg-surface hover:bg-surface-2"
                        )}
                      >
                        <input
                          type="radio"
                          name="door-payment"
                          value={method.id}
                          checked={checked}
                          onChange={() => vm.setPaymentMethod(method.id)}
                          className="sr-only"
                        />
                        {method.label}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted">
                  {vm.paymentMethod === "complimentary"
                    ? "Free ticket: nothing to collect."
                    : vm.paymentMethod === "cash"
                      ? "Collect the cash before selling."
                      : "Take the payment on your own terminal or phone first. The app only records it."}
                </p>
              </fieldset>

              <Switch
                checked={vm.checkIn}
                onChange={vm.setCheckIn}
                label="Check in now"
                description={
                  vm.checkInOpen
                    ? "Marks the tickets as used so the buyer walks straight in."
                    : "Check-in opens 6 hours before the event. Leave this off and the buyer scans in later."
                }
              />

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
                <span className="text-sm font-semibold text-muted">Total</span>
                <span className="text-3xl font-extrabold tabular-nums">{vm.totalLabel}</span>
              </div>

              {vm.error ? (
                <p role="alert" className="rounded-md border border-danger/40 bg-danger-bg p-3 text-sm font-semibold text-danger">
                  {vm.error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="h-16 text-lg" isLoading={vm.isSelling}>
                Sell {ticketsLabel(vm.quantity)}
              </Button>
            </>
          ) : (
            <p role="alert" className="text-base font-semibold text-danger">
              Every ticket type is sold out.
            </p>
          )}
        </form>
      )}

      <DoorSalesHistory vm={history} />
    </div>
  );
}

const PAYMENT_LABELS = Object.fromEntries(DOOR_PAYMENT_METHODS.map((method) => [method.id, method.label]));

function SaleResult({ sale, onNext }: { sale: DoorSale; onNext: () => void }) {
  return (
    <section aria-label="Sale complete" className="grid gap-4 rounded-xl border border-success/40 bg-success-bg p-4">
      <div className="grid gap-1 text-center">
        <p aria-hidden className="text-4xl text-success">
          ✓
        </p>
        <p className="text-2xl font-extrabold">
          Sold {ticketsLabel(sale.tickets.length)}
        </p>
        <p className="text-xl font-bold">{sale.holderName}</p>
        <p className="text-base text-muted">
          {sale.ticketTypeName} · {PAYMENT_LABELS[sale.paymentMethod]} · {sale.total}
        </p>
        <p className="text-base font-semibold">
          {sale.checkedIn ? "Checked in. Let them in." : "Not checked in yet: the buyer can photograph the QR and scan in later."}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {sale.tickets.map((ticket) => (
          <li key={ticket.id} className="grid justify-items-center gap-2 rounded-lg border border-border bg-surface p-3">
            <TicketQr code={ticket.code} size={180} />
            <span className="font-mono text-base tracking-widest">{ticket.code}</span>
          </li>
        ))}
      </ul>

      <Button size="lg" className="h-16 text-lg" onClick={onNext} autoFocus>
        Next buyer
      </Button>
    </section>
  );
}

const METHOD_HINTS: Record<string, string> = {
  cash: "Collected at the door",
  card: "On your terminal",
  mobile_money: "On your phone",
  complimentary: "Free tickets",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Unpaid",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  active: "Not checked in",
  used: "Checked in",
  cancelled: "Cancelled",
};

// What was sold at the door: totals per payment method (to count the cash
// drawer against) and the latest sales, each able to show its QRs again.
function DoorSalesHistory({ vm }: { vm: DoorSalesHistoryViewModel }) {
  return (
    <section aria-labelledby="door-sales-heading" className="grid gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="door-sales-heading" className="text-lg font-bold">
          Door sales
        </h2>
        {vm.totalCount > 0 ? (
          <span className="text-sm text-muted tabular-nums">
            {ticketsLabel(vm.ticketCount)} · {vm.amountLabel}
          </span>
        ) : null}
      </div>

      {vm.error ? (
        <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
      ) : vm.isLoading && vm.totalCount === 0 ? (
        <SkeletonRows rows={3} label="Loading door sales" />
      ) : vm.totalCount === 0 ? (
        <p className="text-sm text-muted">No door sales yet. Each sale you make here is listed below the form.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {vm.methods.map((method) => (
              <div
                key={method.id}
                className={cn(
                  "grid content-start gap-0.5 rounded-lg border p-3",
                  method.id === "cash" ? "border-accent bg-surface" : "border-border bg-surface-2"
                )}
              >
                <dt className="text-sm font-semibold">
                  {method.label}
                  <span className="block text-xs font-normal text-muted">{METHOD_HINTS[method.id]}</span>
                </dt>
                <dd className="text-xl font-extrabold tabular-nums">
                  {method.id === "complimentary" ? ticketsLabel(method.tickets) : method.amountLabel}
                </dd>
                {method.id !== "complimentary" ? (
                  <dd className="text-xs text-muted tabular-nums">{ticketsLabel(method.tickets)}</dd>
                ) : null}
              </div>
            ))}
          </dl>

          <h3 className="text-sm font-semibold text-muted">Recent sales</h3>
          <ul className="grid divide-y divide-border rounded-lg border border-border bg-surface">
            {vm.sales.map((sale) => (
              <DoorSaleRow key={sale.id} sale={sale} isOpen={vm.openSaleId === sale.id} onToggle={() => vm.toggleSale(sale.id)} />
            ))}
          </ul>

          {vm.hasMore ? (
            <Button variant="secondary" onClick={vm.showMore}>
              Show more ({vm.totalCount - vm.sales.length} left)
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

function DoorSaleRow({ sale, isOpen, onToggle }: { sale: DoorSaleHistoryItem; isOpen: boolean; onToggle: () => void }) {
  const panelId = `door-sale-${sale.id}`;
  const unpaid = sale.status !== "paid";

  return (
    <li className="grid gap-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold break-words">{sale.buyerName}</span>
            {unpaid ? <Badge tone="warning">{ORDER_STATUS_LABELS[sale.status] ?? sale.status}</Badge> : null}
          </span>
          <span className="text-sm text-muted">
            {sale.typesLabel} · {PAYMENT_LABELS[sale.paymentMethod]}
          </span>
          <span className="text-xs text-muted">
            <LocalDateTime iso={sale.createdAt} format="time" /> · {sale.sellerLabel}
          </span>
        </div>
        <span className={cn("shrink-0 text-base font-bold tabular-nums", unpaid && "text-muted line-through")}>{sale.totalLabel}</span>
      </div>

      <p className="font-mono text-xs tracking-wider break-all text-muted">{sale.tickets.map((ticket) => ticket.code).join(" · ")}</p>

      <Button variant="ghost" size="sm" className="justify-self-start" aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} onClick={onToggle}>
        {isOpen ? "Hide QR codes" : sale.tickets.length === 1 ? "Show QR code" : "Show QR codes"}
      </Button>

      {isOpen ? (
        <ul id={panelId} className="grid gap-3 sm:grid-cols-2">
          {sale.tickets.map((ticket) => (
            <li key={ticket.code} className="grid justify-items-center gap-2 rounded-lg border border-border bg-surface-2 p-3">
              <TicketQr code={ticket.code} size={180} dimmed={ticket.status !== "active"} />
              <span className="font-mono text-base tracking-widest">{ticket.code}</span>
              <span className="text-xs font-semibold text-muted">{TICKET_STATUS_LABELS[ticket.status]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
