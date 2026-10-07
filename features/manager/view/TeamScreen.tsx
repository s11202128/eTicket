"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatShortDateTime } from "@/lib/format";
import { siteConfig } from "@/lib/siteConfig";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { useTeam } from "@/features/manager/viewmodel/useTeam";

export default function TeamScreen({ initialEventId }: { initialEventId: string | null }) {
  const vm = useTeam(initialEventId);

  return (
    <>
      <PageHeader
        title="Team"
        description="Door staff can scan tickets for the event you add them to, and nothing else."
      />

      {vm.eventsError ? (
        <ErrorState message={vm.eventsError} />
      ) : vm.eventsLoading ? (
        <SkeletonRows rows={4} label="Loading events" />
      ) : vm.events.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No upcoming events"
          description="Create an event first, then add the people who'll check guests in at the door."
          action={<ButtonLink href="/manager/events/new">Create event</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <Card className="grid content-start gap-4">
            <CardTitle>Add door staff</CardTitle>
            <Field label="Event">
              {(props) => (
                <Select {...props} value={vm.eventId ?? ""} onChange={(event) => vm.chooseEvent(event.target.value)}>
                  {vm.events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} · {formatShortDateTime(event.startsAt)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <form
              noValidate
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void vm.add();
              }}
            >
              <Field label="Their email" error={vm.emailError ?? undefined} hint="The email they use to log in.">
                {(props) => (
                  <Input {...props} type="email" autoComplete="off" value={vm.email} onChange={(event) => vm.setEmail(event.target.value)} />
                )}
              </Field>
              <Button type="submit" isLoading={vm.isAdding} className="justify-self-start">
                Add to team
              </Button>
            </form>
            {vm.noAccountEmail ? (
              <div role="status" className="rounded-md border border-warning/40 bg-warning-bg p-3 text-sm">
                <p className="font-bold text-warning">No account for {vm.noAccountEmail}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg">
                  <li>Ask them to sign up on {siteConfig.name} with this email (choose &ldquo;Book tickets&rdquo;).</li>
                  <li>Once they&apos;ve confirmed their email, add them here again.</li>
                </ol>
              </div>
            ) : null}
          </Card>

          <Card className="grid content-start gap-4">
            <CardTitle>Current team</CardTitle>
            {vm.staffError ? (
              <ErrorState message={vm.staffError} />
            ) : vm.staffLoading ? (
              <SkeletonRows rows={3} label="Loading team" />
            ) : vm.staff.length === 0 ? (
              <p className="text-sm text-muted">Nobody yet. You can always check guests in yourself.</p>
            ) : (
              <ul className="grid divide-y divide-border">
                {vm.staff.map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-3 py-3">
                    <span className="grid min-w-0">
                      <span className="truncate font-semibold">{member.name || member.email}</span>
                      {member.name ? <span className="truncate text-sm text-muted">{member.email}</span> : null}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void vm.remove(member)}
                      isLoading={vm.removing === member.userId}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
