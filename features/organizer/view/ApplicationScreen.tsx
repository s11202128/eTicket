"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { Skeleton } from "@/components/ui/Skeleton";
import type { OrganizerStatus } from "@/lib/database.types";
import { siteConfig } from "@/lib/siteConfig";
import { FormMessage } from "@/features/auth/view/AuthPanel";
import { organizerLogoUrl, type OrganizerApplication } from "@/features/organizer/model/organizer.repository";
import { OrganizerProfileForm } from "@/features/organizer/view/OrganizerProfileForm";
import { useApplicationViewModel, type ApplicationViewModel } from "@/features/organizer/viewmodel/useApplicationViewModel";

const STATUS: Record<OrganizerStatus, { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  pending: { label: "Under review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

export default function ApplicationScreen() {
  const vm = useApplicationViewModel();

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6">
      <div className="grid gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Host events on {siteConfig.name}</h1>
        <p className="text-muted">
          Organizer accounts are reviewed by our team, usually within two working days. Once approved you can create
          events, sell tickets and check guests in.
        </p>
      </div>

      {vm.successMessage ? <FormMessage tone="success">{vm.successMessage}</FormMessage> : null}

      {vm.loadError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-bg p-4 font-semibold text-danger">
          {vm.loadError}
        </p>
      ) : vm.isLoading ? (
        <div role="status" aria-label="Loading your application" className="grid gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <>
          {vm.application ? <StatusCard application={vm.application} vm={vm} /> : null}
          {vm.isEditing ? <ApplicationForm vm={vm} /> : null}
        </>
      )}
    </div>
  );
}

function StatusCard({ application, vm }: { application: OrganizerApplication; vm: ApplicationViewModel }) {
  const status = STATUS[application.status];

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {application.logoPath ? (
          <Image
            src={organizerLogoUrl(application.logoPath)}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="size-14 rounded-lg object-cover"
          />
        ) : null}
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="truncate text-lg font-bold">{application.organizationName}</p>
          <p className="text-sm text-muted">
            Applied <LocalDateTime iso={application.createdAt} format="date" />
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {application.status === "pending" ? (
        <>
          <p className="text-sm text-muted">
            Thanks for applying. We&apos;re reviewing your details and will notify you when there&apos;s a decision. You
            can still edit your application while it&apos;s under review.
          </p>
          {!vm.isEditing ? (
            <Button variant="secondary" className="justify-self-start" onClick={vm.startEditing}>
              Edit application
            </Button>
          ) : null}
        </>
      ) : null}

      {application.status === "rejected" ? (
        <>
          {application.reviewNote ? (
            <div className="rounded-md border border-danger/40 bg-danger-bg p-3 text-sm">
              <p className="font-semibold text-danger">Reason from our team</p>
              <p className="mt-1 whitespace-pre-line text-fg">{application.reviewNote}</p>
            </div>
          ) : null}
          <p className="text-sm text-muted">Update your details and send the application again.</p>
          {!vm.isEditing ? (
            <Button className="justify-self-start" onClick={vm.startEditing}>
              Edit and reapply
            </Button>
          ) : null}
        </>
      ) : null}

      {application.status === "suspended" ? (
        <>
          {application.reviewNote ? (
            <div className="rounded-md border border-danger/40 bg-danger-bg p-3 text-sm">
              <p className="font-semibold text-danger">Reason</p>
              <p className="mt-1 whitespace-pre-line text-fg">{application.reviewNote}</p>
            </div>
          ) : null}
          <p className="text-sm text-muted">
            Your organizer account is suspended, so you can&apos;t create or edit events. Events already live stay on
            sale. Contact{" "}
            <a href={`mailto:${siteConfig.contactEmail}`} className="font-semibold text-accent-text hover:underline">
              {siteConfig.contactEmail}
            </a>{" "}
            to resolve this.
          </p>
        </>
      ) : null}

      {application.status === "approved" ? (
        <>
          <p className="text-sm text-muted">You&apos;re approved to host events.</p>
          <ButtonLink href="/manager" className="justify-self-start">
            Go to Event Manager dashboard
          </ButtonLink>
        </>
      ) : null}
    </Card>
  );
}

function ApplicationForm({ vm }: { vm: ApplicationViewModel }) {
  const isFirst = !vm.application;
  const submitLabel = isFirst
    ? "Submit application"
    : vm.application?.status === "rejected"
      ? "Resubmit application"
      : "Save changes";

  return (
    <Card>
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void vm.onSubmit();
        }}
      >
        <h2 className="text-lg font-bold">{isFirst ? "Your organizer profile" : "Edit your application"}</h2>
        <OrganizerProfileForm form={vm.form} disabled={vm.isSubmitting} />
        {vm.submitError ? <FormMessage tone="error">{vm.submitError}</FormMessage> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" isLoading={vm.isSubmitting}>
            {submitLabel}
          </Button>
          {!isFirst ? (
            <Button type="button" variant="ghost" size="lg" onClick={vm.cancelEditing} disabled={vm.isSubmitting}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
