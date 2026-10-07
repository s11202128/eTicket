"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatDateTime, formatPrice } from "@/lib/format";
import { FALLBACK_EVENT_IMAGE } from "@/lib/storage";
import { REGIONS } from "@/lib/regions";
import type { EventFormInput } from "@/features/admin/model/eventForm.schema";
import { siteConfig } from "@/lib/siteConfig";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { EventStatusBadge } from "@/features/admin/view/StatusBadges";
import { useEventEditor } from "@/features/admin/viewmodel/useEventEditor";

function safeDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function EventEditorScreen() {
  const params = useParams<{ id?: string }>();
  const vm = useEventEditor(params.id);
  const { values, errors } = vm;

  if (vm.isLoading) {
    return <SkeletonRows rows={10} label="Loading event" />;
  }

  if (vm.loadError) {
    return (
      <>
        <ErrorState message={vm.loadError} />
        <ButtonLink href="/admin/events" variant="secondary" className="justify-self-start">
          Back to events
        </ButtonLink>
      </>
    );
  }

  const startsIso = values.startsAt ? safeDate(values.startsAt) : null;
  const categoryName = vm.categories.find((category) => category.id === values.categoryId)?.name;
  const priceNumber = Number(values.price);

  return (
    <>
      <PageHeader
        title={vm.mode === "edit" ? "Edit event" : "New event"}
        description={
          vm.mode === "edit"
            ? `${vm.sold} ticket${vm.sold === 1 ? "" : "s"} sold so far.`
            : "Drafts are only visible to admins until you publish them."
        }
        actions={vm.mode === "edit" && vm.currentStatus === "cancelled" ? <EventStatusBadge status="cancelled" /> : null}
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void vm.onSubmit();
        }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="grid content-start gap-6">
          <Card className="grid gap-4">
            <CardTitle>Details</CardTitle>
            <Field label="Title" required error={errors.title}>
              {(props) => (
                <Input {...props} value={values.title} maxLength={120} onChange={(event) => vm.setField("title", event.target.value)} />
              )}
            </Field>
            <Field
              label="Slug"
              required
              hint={`Public address: /events/${values.slug || "your-event"}`}
              error={errors.slug}
            >
              {(props) => (
                <Input {...props} value={values.slug} maxLength={80} onChange={(event) => vm.onSlugChange(event.target.value)} />
              )}
            </Field>
            <Field label="Description" error={errors.description}>
              {(props) => (
                <Textarea
                  {...props}
                  rows={6}
                  maxLength={5000}
                  value={values.description}
                  onChange={(event) => vm.setField("description", event.target.value)}
                />
              )}
            </Field>
            <Field label="Category" hint="Manage the list under Categories." error={errors.categoryId}>
              {(props) => (
                <Select {...props} value={values.categoryId} onChange={(event) => vm.setField("categoryId", event.target.value)}>
                  <option value="">Uncategorised</option>
                  {vm.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Card>

          <Card className="grid gap-4 sm:grid-cols-2">
            <CardTitle className="sm:col-span-2">When and where</CardTitle>
            <Field label="Starts" required hint="Your local time." error={errors.startsAt}>
              {(props) => (
                <Input {...props} type="datetime-local" value={values.startsAt} onChange={(event) => vm.setField("startsAt", event.target.value)} />
              )}
            </Field>
            <Field label="Ends" hint="Optional. Check-in closes at this time." error={errors.endAt}>
              {(props) => (
                <Input {...props} type="datetime-local" value={values.endAt} onChange={(event) => vm.setField("endAt", event.target.value)} />
              )}
            </Field>
            <Field label="Region" required hint="Used by the region filter on the events page." error={errors.region}>
              {(props) => (
                <Select
                  {...props}
                  value={values.region}
                  onChange={(event) => vm.setField("region", event.target.value as EventFormInput["region"])}
                >
                  {REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Location" required error={errors.location}>
              {(props) => (
                <Input {...props} value={values.location} maxLength={200} onChange={(event) => vm.setField("location", event.target.value)} />
              )}
            </Field>
          </Card>

          <Card className="grid gap-4 sm:grid-cols-3">
            <CardTitle className="sm:col-span-3">Tickets</CardTitle>
            <Field label={`Price (${siteConfig.currency.code})`} required hint="0 = free" error={errors.price}>
              {(props) => (
                <Input {...props} type="number" min="0" step="0.01" inputMode="decimal" value={values.price} onChange={(event) => vm.setField("price", event.target.value)} />
              )}
            </Field>
            <Field label="Capacity" hint="Empty = unlimited" error={errors.capacity}>
              {(props) => (
                <Input {...props} type="number" min="1" step="1" inputMode="numeric" value={values.capacity} onChange={(event) => vm.setField("capacity", event.target.value)} />
              )}
            </Field>
            <Field label="Max per person" required error={errors.maxTicketsPerUser}>
              {(props) => (
                <Input {...props} type="number" min="1" max="50" step="1" inputMode="numeric" value={values.maxTicketsPerUser} onChange={(event) => vm.setField("maxTicketsPerUser", event.target.value)} />
              )}
            </Field>
          </Card>

          <Card className="grid gap-4">
            <CardTitle>Image</CardTitle>
            {vm.imagePreview ? (
              <div className="grid gap-2">
                <Image
                  src={vm.imagePreview}
                  alt="Event image preview"
                  width={800}
                  height={400}
                  unoptimized
                  className="aspect-[2/1] w-full rounded-md object-cover"
                />
                <Button variant="secondary" size="sm" className="justify-self-start" onClick={vm.removeImage}>
                  Remove image
                </Button>
              </div>
            ) : null}
            <Field label={vm.imagePreview ? "Replace image" : "Upload image"} hint="JPG, PNG, WebP or GIF, up to 5 MB. Wide images (2:1) look best." error={errors.imagePath}>
              {(props) => (
                <Input
                  {...props}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={vm.isUploading}
                  className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
                  onChange={(event) => void vm.onImageSelected(event.target.files?.[0])}
                />
              )}
            </Field>
            {vm.isUploading ? <p role="status" className="text-sm text-muted">Uploading…</p> : null}
          </Card>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6">
          <Card className="grid gap-4">
            <CardTitle>Publishing</CardTitle>
            <Field
              label="Status"
              hint={
                vm.currentStatus === "cancelled"
                  ? "This event is cancelled. Edits are saved but it stays cancelled."
                  : "Only published events are visible to the public."
              }
            >
              {(props) => (
                <Select {...props} disabled={vm.currentStatus === "cancelled"} value={values.status} onChange={(event) => vm.setField("status", event.target.value as "draft" | "published")}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              )}
            </Field>
            <Switch
              checked={values.isFeatured}
              onChange={(checked) => vm.setField("isFeatured", checked)}
              label="Featured"
              description="Show on the homepage. Order them under Content."
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={vm.isSaving} disabled={vm.isUploading}>
                {vm.mode === "edit" ? "Save changes" : "Create event"}
              </Button>
              <ButtonLink href="/admin/events" variant="secondary">
                Cancel
              </ButtonLink>
            </div>
          </Card>

          <section aria-label="Live preview" className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Live preview</p>
            <div className="theme-public overflow-hidden rounded-lg border border-border bg-surface text-fg">
              <Image
                src={vm.imagePreview ?? FALLBACK_EVENT_IMAGE}
                alt=""
                width={640}
                height={320}
                unoptimized
                className="aspect-[2/1] w-full object-cover"
              />
              <div className="grid gap-1.5 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {categoryName ? <Badge tone="neutral">{categoryName}</Badge> : null}
                  {values.isFeatured ? <Badge tone="accent">Featured</Badge> : null}
                  {values.status === "draft" ? <Badge tone="warning">Draft</Badge> : null}
                </div>
                <h3 className="text-lg font-extrabold leading-tight">{values.title || "Event title"}</h3>
                <p className="text-sm text-muted">{startsIso ? formatDateTime(startsIso) : "Date and time"}</p>
                <p className="text-sm text-muted">{values.location || "Location"}</p>
                <p className="mt-1 text-base font-bold text-accent-text">
                  {Number.isFinite(priceNumber) && values.price !== "" ? formatPrice(priceNumber) : "Price"}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </form>
    </>
  );
}
