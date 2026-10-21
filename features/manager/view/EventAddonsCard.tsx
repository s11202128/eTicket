"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/format";
import { ErrorState } from "@/features/admin/view/AdminUi";
import { usageLabel } from "@/features/manager/model/eventExtras";
import { useEventAddons, type EventAddonsViewModel } from "@/features/manager/viewmodel/useEventAddons";

export function EventAddonsCard({ eventId }: { eventId: string }) {
  const vm = useEventAddons(eventId);

  return (
    <Card className="grid content-start gap-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Add-ons</CardTitle>
        <Button variant="secondary" size="sm" onClick={vm.openNew}>
          Add add-on
        </Button>
      </div>

      {vm.error ? (
        <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
      ) : vm.isLoading && vm.addons.length === 0 ? (
        <SkeletonRows rows={2} label="Loading add-ons" />
      ) : vm.addons.length === 0 ? (
        <p className="text-sm text-muted">No add-ons yet. Sell extras like parking, merch or meals with the tickets.</p>
      ) : (
        <ul className="grid divide-y divide-border">
          {vm.addons.map((addon, index) => {
            const soldOut = addon.quantity !== null && addon.sold >= addon.quantity;
            return (
              <li key={addon.id} className="grid gap-2 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
                <div className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold break-words">{addon.name}</span>
                    {!addon.isActive ? <Badge>Hidden</Badge> : soldOut ? <Badge tone="danger">Sold out</Badge> : null}
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {formatPrice(addon.price)} · {usageLabel(addon.sold, addon.quantity, "sold")}
                  </span>
                  {addon.description ? <span className="text-xs text-muted">{addon.description}</span> : null}
                </div>
                <div className="flex flex-wrap gap-1 sm:shrink-0">
                  <MoveButton
                    direction="up"
                    label={`Move ${addon.name} up`}
                    onClick={() => vm.moveUp(addon)}
                    disabled={index === 0}
                  />
                  <MoveButton
                    direction="down"
                    label={`Move ${addon.name} down`}
                    onClick={() => vm.moveDown(addon)}
                    disabled={index === vm.addons.length - 1}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void vm.toggleActive(addon)}
                    isLoading={vm.toggling === addon.id}
                    aria-label={`${addon.isActive ? "Hide" : "Show"} ${addon.name}`}
                  >
                    {addon.isActive ? "Hide" : "Show"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => vm.openEdit(addon)} aria-label={`Edit ${addon.name}`}>
                    Edit
                  </Button>
                  {addon.sold === 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => vm.confirmDelete.ask(addon)} aria-label={`Delete ${addon.name}`}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Kept mounted so screen readers announce each move. */}
      <p aria-live="polite" className="sr-only">
        {vm.moveAnnouncement}
      </p>

      {vm.editing ? <AddonForm vm={vm} /> : null}

      <ConfirmDialog
        open={vm.confirmDelete.pending !== null}
        title={`Delete ${vm.confirmDelete.pending?.name ?? "this add-on"}?`}
        description="It's removed from the event page. This can't be undone."
        confirmLabel="Delete add-on"
        isLoading={vm.isDeleting}
        onConfirm={() => void vm.remove()}
        onCancel={vm.confirmDelete.close}
      />
    </Card>
  );
}

// Arrow icon button; the label names the add-on for screen readers.
function MoveButton({
  direction,
  label,
  onClick,
  disabled,
}: {
  direction: "up" | "down";
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-8 px-0 pointer-coarse:w-10"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Button>
  );
}

function AddonForm({ vm }: { vm: EventAddonsViewModel }) {
  const { values, errors, setField } = vm;
  const editing = vm.editing!;
  const isNew = editing === "new";
  const formId = "event-addon-form";

  return (
    <Dialog
      open
      onClose={vm.close}
      title={editing === "new" ? "Add add-on" : `Edit ${editing.name}`}
      description="Buyers can add it to their order when they book tickets."
      footer={
        <>
          <Button variant="secondary" onClick={vm.close} disabled={vm.isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={vm.isSaving}>
            {isNew ? "Add add-on" : "Save"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void vm.save();
        }}
      >
        <Field label="Name" required error={errors.name}>
          {(props) => (
            <Input
              {...props}
              maxLength={60}
              placeholder="e.g. Parking pass"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          )}
        </Field>
        <Field label="Description" error={errors.description} hint="Optional. Up to 300 characters.">
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              maxLength={300}
              className="min-h-16"
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price" required error={errors.price} hint="0 for free.">
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={values.price}
                onChange={(event) => setField("price", event.target.value)}
              />
            )}
          </Field>
          <Field label="Quantity" error={errors.quantity} hint="Empty = unlimited.">
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={values.quantity}
                onChange={(event) => setField("quantity", event.target.value)}
              />
            )}
          </Field>
        </div>
        <Switch
          checked={values.isActive}
          onChange={(checked) => setField("isActive", checked)}
          label="On sale"
          description="Hidden add-ons stay on past orders but can't be bought."
        />
      </form>
    </Dialog>
  );
}
