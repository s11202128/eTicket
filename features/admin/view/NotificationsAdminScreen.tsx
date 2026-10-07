"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatDate, formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { useAdminNotifications, type Audience } from "@/features/admin/viewmodel/useAdminNotifications";

const AUDIENCES: { id: Audience; label: string; description: string }[] = [
  { id: "everyone", label: "All users", description: "Everyone with an account sees it in their notifications." },
  { id: "event", label: "Ticket holders of an event", description: "Only people with an active or used ticket for one event." },
];

export default function NotificationsAdminScreen() {
  const vm = useAdminNotifications();
  const recent = vm.recent;

  return (
    <>
      <PageHeader title="Notifications" description="Send a message that appears under the bell for your users." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              vm.requestSend();
            }}
          >
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Send to</legend>
              {AUDIENCES.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                    vm.audience === option.id ? "border-fg bg-surface-2" : "border-border"
                  )}
                >
                  <input
                    type="radio"
                    name="audience"
                    value={option.id}
                    checked={vm.audience === option.id}
                    onChange={() => vm.setAudience(option.id)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {vm.audience === "event" ? (
              <Field label="Event" required error={vm.errors.eventId}>
                {(props) => (
                  <Select {...props} value={vm.eventId} onChange={(event) => vm.setEventId(event.target.value)}>
                    <option value="">Choose an event…</option>
                    {vm.eventOptions.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} ({formatDate(event.startsAt)})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}

            <Field label="Title" required error={vm.errors.title}>
              {(props) => <Input {...props} maxLength={120} value={vm.draft.title} onChange={(event) => vm.setField("title", event.target.value)} />}
            </Field>
            <Field label="Message" error={vm.errors.body}>
              {(props) => <Textarea {...props} rows={4} maxLength={1000} value={vm.draft.body} onChange={(event) => vm.setField("body", event.target.value)} />}
            </Field>
            <Field label="Link (optional)" hint="A page on this site, e.g. /events/summer-fest" error={vm.errors.link}>
              {(props) => <Input {...props} value={vm.draft.link} onChange={(event) => vm.setField("link", event.target.value)} placeholder="/events/…" />}
            </Field>
            <Button type="submit" className="justify-self-start">
              Review and send
            </Button>
          </form>
        </Card>

        <Card className="grid content-start gap-3">
          <CardTitle>Recent messages to all users</CardTitle>
          {recent.error ? <ErrorState message={recent.error} onRetry={recent.reload} /> : null}
          {recent.isLoading && !recent.data ? (
            <SkeletonRows rows={3} label="Loading recent messages" />
          ) : recent.data && recent.data.length === 0 ? (
            <p className="text-sm text-muted">Nothing sent yet.</p>
          ) : (
            <ul className="grid gap-3">
              {recent.data?.map((item) => (
                <li key={item.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.body ? <p className="line-clamp-2 text-xs text-muted">{item.body}</p> : null}
                  <p className="mt-1 text-xs text-muted">{formatShortDateTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={vm.confirmOpen}
        title="Send this notification?"
        tone="primary"
        confirmLabel="Send"
        isLoading={vm.isSending}
        onConfirm={() => void vm.send()}
        onCancel={vm.closeConfirm}
        description={
          vm.audience === "everyone"
            ? "Every user will see it. It can't be unsent."
            : `Everyone holding a ticket for "${vm.selectedEvent?.title ?? "this event"}" will see it. It can't be unsent.`
        }
      >
        <div className="rounded-md border border-border bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{vm.draft.title}</p>
          {vm.draft.body ? <p className="mt-1 whitespace-pre-line text-muted">{vm.draft.body}</p> : null}
          {vm.draft.link ? <p className="mt-1 font-mono text-xs">{vm.draft.link}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
