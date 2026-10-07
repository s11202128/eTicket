"use client";

import Image from "next/image";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import type { OrganizerStatus } from "@/lib/database.types";
import { useProfileViewModel } from "@/features/profile/viewmodel/useProfileViewModel";

const HOSTING: Record<OrganizerStatus | "none", { body: string; href: string; label: string }> = {
  none: {
    body: "Organize concerts, sports or community events? Apply for an organizer account to sell tickets on E-Ticket.",
    href: "/manager/application",
    label: "Host events",
  },
  pending: { body: "Your organizer application is being reviewed.", href: "/manager/application", label: "View application" },
  rejected: {
    body: "Your organizer application wasn't approved. You can update it and apply again.",
    href: "/manager/application",
    label: "Edit and reapply",
  },
  suspended: { body: "Your organizer account is suspended.", href: "/manager/application", label: "View details" },
  approved: { body: "You're an approved organizer.", href: "/manager", label: "Event Manager dashboard" },
};

export default function ProfileScreen({ organizerStatus }: { organizerStatus: OrganizerStatus | null }) {
  const hosting = HOSTING[organizerStatus ?? "none"];
  const vm = useProfileViewModel();

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Profile</h1>

      {vm.loadError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-bg p-4 font-semibold text-danger">
          {vm.loadError}
        </p>
      ) : vm.isLoading ? (
        <div role="status" aria-label="Loading profile" className="grid gap-4">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <Card>
          <form
            noValidate
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void vm.onSave();
            }}
          >
            <div className="flex flex-wrap items-center gap-5">
              {vm.avatarUrl ? (
                <Image src={vm.avatarUrl} alt="Your avatar" width={96} height={96} unoptimized className="size-24 rounded-full object-cover" />
              ) : (
                <span aria-hidden className="grid size-24 place-items-center rounded-full bg-accent text-3xl font-bold text-on-accent">
                  {(vm.fullName || vm.email).charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <div className="grid gap-2">
                <Field label="Avatar" hint="JPG, PNG or WebP, up to 2 MB." error={vm.avatarError ?? undefined}>
                  {(props) => (
                    <Input
                      {...props}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={vm.isUploading}
                      className="h-auto py-2"
                      onChange={(event) => void vm.onAvatarSelected(event.target.files?.[0])}
                    />
                  )}
                </Field>
                {vm.isUploading ? <p role="status" className="text-sm text-muted">Uploading…</p> : null}
                {vm.avatarUrl ? (
                  <Button variant="ghost" size="sm" className="justify-self-start" onClick={vm.removeAvatar}>
                    Remove avatar
                  </Button>
                ) : null}
              </div>
            </div>

            <Field label="Email" hint="Your sign-in email can't be changed here.">
              {(props) => <Input {...props} type="email" value={vm.email} disabled />}
            </Field>
            <Field label="Full name" hint="Shown on your tickets and at check-in." error={vm.nameError ?? undefined}>
              {(props) => (
                <Input {...props} autoComplete="name" maxLength={80} value={vm.fullName} onChange={(event) => vm.setFullName(event.target.value)} />
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={vm.isSaving} disabled={vm.isUploading}>
                Save profile
              </Button>
              <ButtonLink href="/forgot-password" variant="secondary">
                Change password
              </ButtonLink>
            </div>
          </form>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-base font-bold">Hosting</h2>
          <p className="text-sm text-muted">{hosting.body}</p>
        </div>
        <ButtonLink href={hosting.href} variant="secondary">
          {hosting.label}
        </ButtonLink>
      </Card>
    </div>
  );
}
