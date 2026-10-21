"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/format";
import { ErrorState } from "@/features/admin/view/AdminUi";
import { discountLabel, promoAvailability, usageLabel, type PromoAvailability } from "@/features/manager/model/eventExtras";
import { usePromoCodes, type PromoCodesViewModel } from "@/features/manager/viewmodel/usePromoCodes";
import type { DiscountType } from "@/lib/database.types";

const AVAILABILITY_BADGE: Record<PromoAvailability, { label: string; tone: "success" | "neutral" | "warning" | "danger" }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "warning" },
  expired: { label: "Expired", tone: "neutral" },
  used_up: { label: "Used up", tone: "danger" },
};

export function PromoCodesCard({ eventId }: { eventId: string }) {
  const vm = usePromoCodes(eventId);
  const now = new Date();

  return (
    <Card className="grid content-start gap-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Promo codes</CardTitle>
        <Button variant="secondary" size="sm" onClick={vm.openNew}>
          Add code
        </Button>
      </div>

      {vm.error ? (
        <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
      ) : vm.isLoading ? (
        <SkeletonRows rows={2} label="Loading promo codes" />
      ) : vm.codes.length === 0 ? (
        <p className="text-sm text-muted">No codes yet. Share a code to give buyers money or a percentage off their tickets.</p>
      ) : (
        <ul className="grid divide-y divide-border">
          {vm.codes.map((code) => {
            const badge = AVAILABILITY_BADGE[promoAvailability(code, now)];
            return (
              <li key={code.id} className="grid gap-2 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
                <div className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold break-all">{code.code}</span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {discountLabel(code.discountType, code.discountValue, formatPrice)} · {usageLabel(code.uses, code.maxUses, "used")}
                  </span>
                  {code.startsAt || code.endsAt ? (
                    <span className="text-xs text-muted">
                      {code.startsAt ? (
                        <>
                          From <LocalDateTime iso={code.startsAt} />
                        </>
                      ) : null}
                      {code.startsAt && code.endsAt ? " · " : null}
                      {code.endsAt ? (
                        <>
                          Until <LocalDateTime iso={code.endsAt} />
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1 sm:shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void vm.toggleActive(code)}
                    isLoading={vm.toggling === code.id}
                    aria-label={`${code.isActive ? "Pause" : "Turn on"} ${code.code}`}
                  >
                    {code.isActive ? "Pause" : "Turn on"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => vm.openEdit(code)} aria-label={`Edit ${code.code}`}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => vm.confirmDelete.ask(code)} aria-label={`Delete ${code.code}`}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {vm.editing ? <PromoCodeForm vm={vm} /> : null}

      <ConfirmDialog
        open={vm.confirmDelete.pending !== null}
        title={`Delete ${vm.confirmDelete.pending?.code ?? "this code"}?`}
        description={
          vm.confirmDelete.pending?.uses
            ? "Buyers can no longer use it. Orders that used it keep their discount."
            : "Buyers can no longer use it. This can't be undone."
        }
        confirmLabel="Delete code"
        isLoading={vm.isDeleting}
        onConfirm={() => void vm.remove()}
        onCancel={vm.confirmDelete.close}
      />
    </Card>
  );
}

function PromoCodeForm({ vm }: { vm: PromoCodesViewModel }) {
  const { values, errors, setField } = vm;
  const editing = vm.editing!;
  const isNew = editing === "new";
  const formId = "promo-code-form";

  return (
    <Dialog
      open
      onClose={vm.close}
      title={editing === "new" ? "Add promo code" : `Edit ${editing.code}`}
      description="The discount comes off the ticket price. Buyers can type the code in any case."
      footer={
        <>
          <Button variant="secondary" onClick={vm.close} disabled={vm.isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={vm.isSaving}>
            {isNew ? "Add code" : "Save"}
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
        <Field label="Code" required error={errors.code} hint="3 to 30 letters, numbers, dashes or underscores.">
          {(props) => (
            <Input
              {...props}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={30}
              className="font-mono uppercase"
              value={values.code}
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount" required>
            {(props) => (
              <Select {...props} value={values.discountType} onChange={(event) => setField("discountType", event.target.value as DiscountType)}>
                <option value="percent">Percent off</option>
                <option value="amount">Amount off</option>
              </Select>
            )}
          </Field>
          <Field label={values.discountType === "percent" ? "Percent" : "Amount"} required error={errors.discountValue}>
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="decimal"
                min={0}
                max={values.discountType === "percent" ? 100 : undefined}
                step={values.discountType === "percent" ? 1 : 0.01}
                value={values.discountValue}
                onChange={(event) => setField("discountValue", event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Max uses" error={errors.maxUses} hint="Each order counts once. Leave empty for unlimited.">
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={values.maxUses}
              onChange={(event) => setField("maxUses", event.target.value)}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts" error={errors.startsAt} hint="Optional.">
            {(props) => (
              <Input {...props} type="datetime-local" value={values.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
            )}
          </Field>
          <Field label="Ends" error={errors.endsAt} hint="Optional.">
            {(props) => (
              <Input {...props} type="datetime-local" value={values.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
            )}
          </Field>
        </div>
        <Switch
          checked={values.isActive}
          onChange={(checked) => setField("isActive", checked)}
          label="Active"
          description="Paused codes are turned down at checkout."
        />
      </form>
    </Dialog>
  );
}
