"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { useContentEditor } from "@/features/admin/viewmodel/useContentEditor";

export default function ContentScreen() {
  const vm = useContentEditor();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (vm.isLoading) return <SkeletonRows rows={10} label="Loading site content" />;
  if (vm.loadError) return <ErrorState message={vm.loadError} onRetry={() => void vm.reload()} />;

  return (
    <>
      <PageHeader title="Content" description="What visitors see on the homepage." />

      <Card className="grid gap-4">
        <CardTitle>Homepage hero</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid content-start gap-4">
            <Field label="Headline" required error={vm.heroError && !vm.hero.title.trim() ? vm.heroError : undefined}>
              {(props) => (
                <Input {...props} maxLength={120} value={vm.hero.title} onChange={(event) => vm.setHero({ ...vm.hero, title: event.target.value })} />
              )}
            </Field>
            <Field label="Subtitle">
              {(props) => (
                <Textarea {...props} rows={3} maxLength={300} value={vm.hero.subtitle} onChange={(event) => vm.setHero({ ...vm.hero, subtitle: event.target.value })} />
              )}
            </Field>
            <Field label="Button text" hint="Links to the events list.">
              {(props) => (
                <Input {...props} maxLength={40} value={vm.hero.ctaText} onChange={(event) => vm.setHero({ ...vm.hero, ctaText: event.target.value })} />
              )}
            </Field>
          </div>
          <div className="grid content-start gap-3">
            {vm.heroImageUrl ? (
              <Image src={vm.heroImageUrl} alt="Hero image preview" width={800} height={400} unoptimized className="aspect-[2/1] w-full rounded-md object-cover" />
            ) : (
              <div className="grid aspect-[2/1] place-items-center rounded-md border border-dashed border-border text-sm text-muted">
                No image (a dark gradient is shown)
              </div>
            )}
            <Field
              label={vm.heroImageUrl ? "Replace image" : "Upload image"}
              hint="Wide image, at least 1600px across. Up to 5 MB."
              error={vm.heroError && vm.hero.title.trim() ? vm.heroError : undefined}
            >
              {(props) => (
                <Input
                  {...props}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={vm.isUploading}
                  className="h-auto py-2"
                  onChange={(event) => void vm.onHeroImage(event.target.files?.[0])}
                />
              )}
            </Field>
            {vm.hero.imagePath ? (
              <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => vm.setHero({ ...vm.hero, imagePath: null })}>
                Remove image
              </Button>
            ) : null}
          </div>
        </div>
        <Button className="justify-self-start" onClick={() => void vm.onSaveHero()} isLoading={vm.saving === "hero"} disabled={vm.isUploading}>
          Save hero
        </Button>
      </Card>

      <Card className="grid gap-4">
        <CardTitle>Announcement bar</CardTitle>
        <Switch
          checked={vm.announcement.enabled}
          onChange={(enabled) => vm.setAnnouncement({ ...vm.announcement, enabled })}
          label="Show announcement bar"
          description="A slim bar at the top of every public page."
        />
        <Field label="Text" hint="Keep it short, one sentence.">
          {(props) => (
            <Input {...props} maxLength={160} value={vm.announcement.text} onChange={(event) => vm.setAnnouncement({ ...vm.announcement, text: event.target.value })} />
          )}
        </Field>
        <Button className="justify-self-start" onClick={() => void vm.onSaveAnnouncement()} isLoading={vm.saving === "announcement"}>
          Save announcement
        </Button>
      </Card>

      <Card className="grid gap-4">
        <div>
          <CardTitle>Featured events</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Shown on the homepage in this order. Drag to reorder, or use the arrow buttons.
          </p>
        </div>

        {vm.featured.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">No featured events yet. Add one below.</p>
        ) : (
          <ol className="grid gap-2">
            {vm.featured.map((event, index) => (
              <li
                key={event.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(dragEvent) => dragEvent.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) vm.moveFeatured(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2",
                  dragIndex === index && "opacity-50"
                )}
              >
                <span aria-hidden className="cursor-grab text-muted">⠿</span>
                <span className="w-6 text-sm font-bold tabular-nums text-muted">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{event.title}</p>
                  <p className="text-xs text-muted">
                    {formatDate(event.startsAt)}
                    {event.status !== "published" ? ` · ${event.status} (hidden from the public)` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" aria-label={`Move ${event.title} up`} disabled={index === 0} onClick={() => vm.moveFeatured(index, index - 1)}>
                  ↑
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Move ${event.title} down`} disabled={index === vm.featured.length - 1} onClick={() => vm.moveFeatured(index, index + 1)}>
                  ↓
                </Button>
                <Button variant="ghost" size="sm" onClick={() => vm.removeFeatured(event.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ol>
        )}

        <Field label="Add an event" hint="Published upcoming events.">
          {(props) => (
            <Select
              {...props}
              value=""
              disabled={vm.candidates.length === 0}
              onChange={(event) => {
                if (event.target.value) vm.addFeatured(event.target.value);
              }}
            >
              <option value="">{vm.candidates.length === 0 ? "No more events to add" : "Choose an event…"}</option>
              {vm.candidates.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({formatDate(event.startsAt)})
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Button className="justify-self-start" onClick={() => void vm.onSaveFeatured()} isLoading={vm.saving === "featured"}>
          Save featured order
        </Button>
      </Card>
    </>
  );
}
