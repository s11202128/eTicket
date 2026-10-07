"use client";

import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { REGIONS } from "@/lib/regions";
import { siteConfig } from "@/lib/siteConfig";
import { eventImageSrc } from "@/lib/storage";
import type { PublicEvent } from "@/features/events/model/events.types";
import { EventDetailScreen } from "@/features/events/view/EventDetailScreen";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { EventStatusBadge } from "@/features/admin/view/StatusBadges";
import type { WizardValues } from "@/features/manager/model/eventWizard";
import { CoverImagePicker } from "@/features/manager/view/CoverImagePicker";
import { useEventWizard, type EventWizardViewModel } from "@/features/manager/viewmodel/useEventWizard";

export default function EventWizardScreen({ eventId }: { eventId: string | null }) {
  const vm = useEventWizard(eventId);
  const isLive = vm.mode === "live";

  if (vm.loadError) return <ErrorState message={vm.loadError} />;
  if (vm.isLoading) return <SkeletonRows rows={8} label="Loading event" />;

  if (vm.mode === "locked" && vm.meta) {
    return (
      <>
        <PageHeader title={vm.meta.title} />
        <Card className="grid gap-3">
          <div className="flex items-center gap-2">
            <EventStatusBadge status={vm.meta.status} />
          </div>
          <p className="text-sm text-muted">
            {vm.meta.status === "pending_review"
              ? "This event is waiting for approval, so it can't be edited right now. We'll notify you when it's reviewed."
              : "This event can't be edited any more."}
          </p>
          <ButtonLink href={`/manager/events/${vm.meta.id}`} variant="secondary" className="justify-self-start">
            Back to event
          </ButtonLink>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={vm.eventId ? (isLive ? "Edit live event" : "Edit event") : "Create event"}
        description={isLive ? "Your event is on sale. Some changes need another review." : "Your draft is saved automatically as you go."}
        actions={<SaveIndicator vm={vm} />}
      />

      {vm.meta?.status === "changes_requested" && vm.meta.reviewNote ? (
        <div role="note" className="rounded-lg border border-warning/40 bg-warning-bg p-4">
          <p className="text-sm font-bold text-warning">Changes requested by our team</p>
          <p className="mt-1 whitespace-pre-line text-sm text-fg">{vm.meta.reviewNote}</p>
          <p className="mt-2 text-xs text-muted">Make the changes, then submit the event for approval again.</p>
        </div>
      ) : null}

      {isLive ? (
        <div
          role="status"
          className={cn(
            "rounded-lg border p-4 text-sm",
            vm.liveSummary?.requiresReview ? "border-warning/40 bg-warning-bg" : "border-border bg-surface"
          )}
        >
          {vm.liveSummary?.requiresReview ? (
            <>
              <p className="font-bold text-warning">This change will send your event back for review.</p>
              <p className="mt-1 text-fg">
                Changed: {vm.liveSummary.majorChanges.join(", ")}. Your event stays visible but bookings pause until it&apos;s
                approved again.
              </p>
            </>
          ) : (
            <p className="text-muted">
              Description, cover image and extra seats update straight away. Changing the title, date, venue, prices or
              lowering quantities sends the event back for review.
            </p>
          )}
        </div>
      ) : null}

      <Stepper vm={vm} />

      <Card>
        <form
          noValidate
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (vm.stepIndex === vm.steps.length - 1) void vm.submit();
            else vm.next();
          }}
        >
          {vm.step === "basics" ? <BasicsStep vm={vm} /> : null}
          {vm.step === "schedule" ? <ScheduleStep vm={vm} /> : null}
          {vm.step === "tickets" ? <TicketsStep vm={vm} /> : null}
          {vm.step === "media" ? <MediaStep vm={vm} /> : null}

          {vm.submitError ? (
            <p role="alert" className="rounded-md border border-danger/40 bg-danger-bg p-3 text-sm font-semibold text-danger">
              {vm.submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            {vm.stepIndex > 0 ? (
              <Button type="button" variant="secondary" onClick={vm.back}>
                Back
              </Button>
            ) : (
              <Link href="/manager/events" className="text-sm font-semibold text-muted hover:text-fg">
                Cancel
              </Link>
            )}
            {vm.stepIndex < vm.steps.length - 1 ? (
              <Button type="submit">Next: {vm.steps[vm.stepIndex + 1].label}</Button>
            ) : isLive ? (
              <Button type="submit" isLoading={vm.isSubmitting} disabled={!vm.liveSummary?.changed}>
                {vm.liveSummary?.requiresReview ? "Save and send for review" : "Save changes"}
              </Button>
            ) : (
              <Button type="submit" isLoading={vm.isSubmitting}>
                Submit for approval
              </Button>
            )}
          </div>
        </form>
      </Card>
    </>
  );
}

function SaveIndicator({ vm }: { vm: EventWizardViewModel }) {
  if (vm.mode === "live") return null;
  const text =
    vm.saveState === "saving"
      ? "Saving…"
      : vm.saveState === "error"
        ? `Not saved: ${vm.saveError ?? "error"}`
        : vm.isDirty
          ? vm.eventId
            ? "Unsaved changes"
            : "Add a title to start saving"
          : vm.eventId
            ? "Draft saved"
            : "";
  if (!text) return null;
  return (
    <p role="status" className={cn("text-sm font-medium", vm.saveState === "error" ? "text-danger" : "text-muted")}>
      {text}
    </p>
  );
}

function Stepper({ vm }: { vm: EventWizardViewModel }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {vm.steps.map((item, index) => {
        const current = index === vm.stepIndex;
        const done = index < vm.stepIndex;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => vm.goTo(item.id)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors",
                current ? "border-fg bg-fg text-surface" : done ? "border-border bg-surface" : "border-border bg-surface text-muted hover:text-fg"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-xs",
                  current ? "bg-accent text-on-accent" : done ? "bg-success-bg text-success" : "bg-surface-2"
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              {item.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function BasicsStep({ vm }: { vm: EventWizardViewModel }) {
  const { values, errors } = vm;
  return (
    <>
      <Field label="Event title" required error={errors.title}>
        {(props) => (
          <Input {...props} maxLength={120} value={values.title} onChange={(event) => vm.update({ title: event.target.value })} />
        )}
      </Field>
      <Field label="Category" hint="Helps people find your event.">
        {(props) => (
          <Select {...props} value={values.categoryId} onChange={(event) => vm.update({ categoryId: event.target.value })}>
            <option value="">No category</option>
            {vm.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label="Description"
        required
        error={errors.description}
        hint="Line-up, what's included, age limits, dress code. Formatting: **bold**, *italic*, lines starting with - become a list, ## makes a heading."
      >
        {(props) => (
          <Textarea
            {...props}
            rows={10}
            maxLength={5000}
            value={values.description}
            onChange={(event) => vm.update({ description: event.target.value })}
          />
        )}
      </Field>
    </>
  );
}

function ScheduleStep({ vm }: { vm: EventWizardViewModel }) {
  const { values, errors } = vm;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" required error={errors.startsAt}>
          {(props) => (
            <Input {...props} type="datetime-local" value={values.startsAt} onChange={(event) => vm.update({ startsAt: event.target.value })} />
          )}
        </Field>
        <Field label="Ends" error={errors.endAt} hint="Optional.">
          {(props) => (
            <Input {...props} type="datetime-local" value={values.endAt} onChange={(event) => vm.update({ endAt: event.target.value })} />
          )}
        </Field>
      </div>
      <Field label="Venue and town" required error={errors.location} hint="e.g. Lawson Tama Stadium, Honiara">
        {(props) => (
          <Input {...props} maxLength={200} value={values.location} onChange={(event) => vm.update({ location: event.target.value })} />
        )}
      </Field>
      <Field label="Region">
        {(props) => (
          <Select
            {...props}
            value={values.region}
            onChange={(event) => vm.update({ region: event.target.value as WizardValues["region"] })}
          >
            {REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
}

function TicketsStep({ vm }: { vm: EventWizardViewModel }) {
  const { values, errors } = vm;
  const isLive = vm.mode === "live";

  return (
    <>
      <div className="grid gap-1">
        <h2 className="text-lg font-bold">Ticket types</h2>
        <p className="text-sm text-muted">
          Prices in {siteConfig.currency.name} ({siteConfig.currency.symbol}). Use 0 for free tickets. Leave quantity empty for
          unlimited.
          {isLive ? " Ticket types can't be added or removed while the event is live." : ""}
        </p>
      </div>

      {errors.ticketTypes ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.ticketTypes}
        </p>
      ) : null}

      <ul className="grid gap-4">
        {values.ticketTypes.map((type, index) => {
          const at = (field: string) => errors[`ticketTypes.${index}.${field}`];
          return (
            <li key={type.key} className="grid gap-4 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">
                  Ticket type {index + 1}
                  {type.sold > 0 ? <span className="ml-2 font-normal text-muted">{type.sold} sold</span> : null}
                </p>
                {!isLive && type.sold === 0 && values.ticketTypes.length > 1 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => vm.removeTicketType(type.key)}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <Field label="Name" required error={at("name")}>
                  {(props) => (
                    <Input
                      {...props}
                      maxLength={60}
                      disabled={isLive}
                      placeholder="General Admission, VIP, Early Bird…"
                      value={type.name}
                      onChange={(event) => vm.updateTicketType(type.key, { name: event.target.value })}
                    />
                  )}
                </Field>
                <Field label={`Price (${siteConfig.currency.symbol})`} required error={at("price")}>
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="decimal"
                      value={type.price}
                      onChange={(event) => vm.updateTicketType(type.key, { price: event.target.value })}
                    />
                  )}
                </Field>
                <Field label="Quantity" error={at("quantity")}>
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="numeric"
                      placeholder="Unlimited"
                      value={type.quantity}
                      onChange={(event) => vm.updateTicketType(type.key, { quantity: event.target.value })}
                    />
                  )}
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sales start" hint="Optional. Empty = on sale once approved." error={at("salesStart")}>
                  {(props) => (
                    <Input
                      {...props}
                      type="datetime-local"
                      disabled={isLive}
                      value={type.salesStart}
                      onChange={(event) => vm.updateTicketType(type.key, { salesStart: event.target.value })}
                    />
                  )}
                </Field>
                <Field label="Sales end" hint="Optional. Empty = until the event ends." error={at("salesEnd")}>
                  {(props) => (
                    <Input
                      {...props}
                      type="datetime-local"
                      disabled={isLive}
                      value={type.salesEnd}
                      onChange={(event) => vm.updateTicketType(type.key, { salesEnd: event.target.value })}
                    />
                  )}
                </Field>
              </div>
            </li>
          );
        })}
      </ul>

      {!isLive ? (
        <Button type="button" variant="secondary" className="justify-self-start" onClick={vm.addTicketType}>
          + Add ticket type
        </Button>
      ) : null}

      <Field label="Maximum tickets per person" required error={errors.maxTicketsPerUser} className="max-w-xs">
        {(props) => (
          <Input
            {...props}
            type="number"
            min={1}
            max={50}
            value={values.maxTicketsPerUser}
            onChange={(event) => vm.update({ maxTicketsPerUser: event.target.value })}
          />
        )}
      </Field>
    </>
  );
}

function previewEvent(vm: EventWizardViewModel): PublicEvent {
  const { values } = vm;
  const prices = values.ticketTypes.map((type) => Number(type.price)).filter((price) => Number.isFinite(price));
  const unlimited = values.ticketTypes.some((type) => type.quantity.trim() === "");
  const capacity = unlimited ? null : values.ticketTypes.reduce((sum, type) => sum + (Number(type.quantity) || 0), 0);
  const category = vm.categories.find((item) => item.id === values.categoryId);
  const startsAt = values.startsAt ? new Date(values.startsAt).toISOString() : new Date().toISOString();

  return {
    id: vm.eventId ?? "preview",
    slug: vm.meta?.slug ?? "preview",
    title: values.title || "Your event title",
    description: values.description || null,
    startsAt,
    endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
    location: values.location || "Venue",
    price: prices.length ? Math.min(...prices) : 0,
    imageSrc: eventImageSrc(values.imagePath, null),
    categoryName: category?.name ?? null,
    categorySlug: category ? "preview" : null,
    capacity,
    sold: 0,
    spotsLeft: capacity,
    isSoldOut: false,
    isPast: false,
    maxTicketsPerUser: Number(values.maxTicketsPerUser) || 4,
    status: "published",
    region: values.region,
  };
}

function MediaStep({ vm }: { vm: EventWizardViewModel }) {
  const { values } = vm;
  return (
    <>
      <div className="grid gap-1">
        <h2 className="text-lg font-bold">Cover image</h2>
        <p className="text-sm text-muted">Shown on event cards and at the top of your event page.</p>
      </div>
      <CoverImagePicker
        imageSrc={values.imagePath ? eventImageSrc(values.imagePath, null) : null}
        isUploading={vm.isUploading}
        onCropped={(file) => void vm.uploadCover(file)}
        onRemove={() => vm.update({ imagePath: null })}
      />

      <div className="grid gap-1 border-t border-border pt-6">
        <h2 className="text-lg font-bold">Preview</h2>
        <p className="text-sm text-muted">
          This is your public event page. Ticket types:{" "}
          {values.ticketTypes
            .map((type) => `${type.name || "Unnamed"} ${type.price === "" ? "" : formatPrice(Number(type.price))}`.trim())
            .join(" · ")}
        </p>
      </div>
      <div className="theme-public max-h-[720px] overflow-y-auto rounded-xl border border-border bg-bg text-fg">
        <div className="pointer-events-none select-none" aria-label="Event page preview">
          <EventDetailScreen event={previewEvent(vm)} isSignedIn isAdmin={false} preview />
        </div>
      </div>
    </>
  );
}
