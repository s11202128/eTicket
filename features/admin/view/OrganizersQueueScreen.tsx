"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import type { OrganizerStatus } from "@/lib/database.types";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import type { OrganizerApplicationRow, OrganizerDecision } from "@/features/admin/model/reviews.repository";
import { useOrganizerQueue, type OrganizerStatusFilter } from "@/features/admin/viewmodel/useOrganizerQueue";

const STATUS_TABS: { id: OrganizerStatusFilter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Suspended" },
  { id: "all", label: "All" },
];

const STATUS_BADGE: Record<OrganizerStatus, { label: string; tone: "warning" | "success" | "danger" }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

const DECISION_COPY: Record<OrganizerDecision, { title: string; confirm: string; description: string; tone: "primary" | "danger" }> = {
  approve: {
    title: "Approve organizer?",
    confirm: "Approve",
    description: "They become an organizer and can create events (each event is still reviewed).",
    tone: "primary",
  },
  reject: {
    title: "Reject application?",
    confirm: "Reject",
    description: "The applicant sees your reason and can update their application and apply again.",
    tone: "danger",
  },
  suspend: {
    title: "Suspend organizer?",
    confirm: "Suspend",
    description: "They can't create or edit events. Events already live stay on sale. You can reinstate them later.",
    tone: "danger",
  },
};

export default function OrganizersQueueScreen() {
  const vm = useOrganizerQueue();

  return (
    <>
      <PageHeader title="Organizers" description="Review applications to host events, and manage approved organizers." />

      <div className="grid gap-4">
        <div className="overflow-x-auto">
          <Tabs tabs={STATUS_TABS} value={vm.status} onChange={vm.setStatus} label="Application status" idPrefix="organizers" />
        </div>
        <Field label="Search organizations" className="max-w-sm">
          {(props) => <Input {...props} type="search" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} />}
        </Field>

        <div id={`organizers-panel-${vm.status}`} role="tabpanel" aria-labelledby={`organizers-tab-${vm.status}`} className="grid gap-3">
          {vm.error ? (
            <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
          ) : vm.isLoading ? (
            <SkeletonRows rows={6} label="Loading applications" />
          ) : vm.rows.length === 0 ? (
            <EmptyState
              icon="🏢"
              title={vm.status === "pending" ? "No applications waiting" : "Nothing here"}
              description={vm.status === "pending" ? "New organizer applications appear here." : undefined}
            />
          ) : (
            <>
              <Table>
                <THead>
                  <tr>
                    <Th>Organization</Th>
                    <Th>Applicant</Th>
                    <Th>Event types</Th>
                    <Th>Status</Th>
                    <Th>{vm.status === "pending" ? "Applied" : "Updated"}</Th>
                  </tr>
                </THead>
                <TBody>
                  {vm.rows.map((row) => (
                    <tr key={row.userId} className="cursor-pointer hover:bg-surface-2" onClick={() => vm.open(row)}>
                      <Td>
                        <button type="button" className="text-left font-semibold hover:underline" onClick={() => vm.open(row)}>
                          {row.organizationName}
                        </button>
                        {row.city ? <span className="block text-xs text-muted">{row.city}</span> : null}
                      </Td>
                      <Td>
                        <span className="block">{row.applicantName}</span>
                        <span className="block text-xs text-muted">{row.applicantEmail}</span>
                      </Td>
                      <Td className="max-w-56 text-xs text-muted">{row.eventTypes.join(", ")}</Td>
                      <Td>
                        <Badge tone={STATUS_BADGE[row.status].tone}>{STATUS_BADGE[row.status].label}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-xs">
                        <LocalDateTime iso={vm.status === "pending" ? row.createdAt : row.updatedAt} format="date" />
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
              <Pagination page={vm.page} pageSize={20} total={vm.total} onPageChange={vm.setPage} />
            </>
          )}
        </div>
      </div>

      {vm.selected ? <ApplicationDrawer row={vm.selected} vm={vm} /> : null}

      {vm.decision && vm.selected ? (
        <ConfirmDialog
          open
          title={DECISION_COPY[vm.decision].title}
          description={
            <>
              <strong className="text-fg">{vm.selected.organizationName}</strong>. {DECISION_COPY[vm.decision].description}
            </>
          }
          confirmLabel={DECISION_COPY[vm.decision].confirm}
          tone={DECISION_COPY[vm.decision].tone}
          isLoading={vm.isDeciding}
          onConfirm={() => void vm.confirmDecision()}
          onCancel={vm.cancelDecision}
        >
          {vm.decision !== "approve" ? (
            <Field label="Reason" required error={vm.noteError ?? undefined} hint="Sent to the organizer.">
              {(props) => <Textarea {...props} rows={3} maxLength={1000} value={vm.note} onChange={(event) => vm.setNote(event.target.value)} />}
            </Field>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function ApplicationDrawer({ row, vm }: { row: OrganizerApplicationRow; vm: ReturnType<typeof useOrganizerQueue> }) {
  const details: [string, ReactNode][] = [
    ["Applicant", <>{row.applicantName} · <a className="text-accent-text hover:underline" href={`mailto:${row.applicantEmail}`}>{row.applicantEmail}</a></>],
    ["Phone", row.phone ? <a className="text-accent-text hover:underline" href={`tel:${row.phone}`}>{row.phone}</a> : "—"],
    ["City", row.city ?? "—"],
    [
      "Website / social",
      row.website ? (
        <a className="break-all text-accent-text hover:underline" href={row.website} target="_blank" rel="noopener noreferrer nofollow">
          {row.website}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Event types", row.eventTypes.length ? row.eventTypes.join(", ") : "—"],
    ["Applied", <LocalDateTime key="applied" iso={row.createdAt} />],
  ];

  return (
    <Dialog
      open
      variant="drawer"
      onClose={vm.close}
      title={row.organizationName}
      description={<Badge tone={STATUS_BADGE[row.status].tone}>{STATUS_BADGE[row.status].label}</Badge>}
      footer={
        <>
          <Button variant="secondary" onClick={vm.close}>
            Close
          </Button>
          {row.status === "pending" ? (
            <>
              <Button variant="danger" onClick={() => vm.startDecision("reject")}>
                Reject
              </Button>
              <Button onClick={() => vm.startDecision("approve")}>Approve</Button>
            </>
          ) : null}
          {row.status === "approved" ? (
            <Button variant="danger" onClick={() => vm.startDecision("suspend")}>
              Suspend
            </Button>
          ) : null}
          {row.status === "suspended" || row.status === "rejected" ? (
            <Button onClick={() => vm.startDecision("approve")}>{row.status === "suspended" ? "Reinstate" : "Approve anyway"}</Button>
          ) : null}
        </>
      }
    >
      {row.logoUrl ? (
        <Image src={row.logoUrl} alt="" width={72} height={72} unoptimized className="size-18 rounded-lg object-cover" />
      ) : null}
      <dl className="grid gap-3 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">About their events</p>
        <p className="whitespace-pre-line text-sm">{row.description || "—"}</p>
      </div>
      {row.reviewNote ? (
        <div className="rounded-md border border-warning/40 bg-warning-bg p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-warning">Last review note</p>
          <p className="mt-1 whitespace-pre-line">{row.reviewNote}</p>
          {row.reviewedAt ? (
            <p className="mt-1 text-xs text-muted">
              <LocalDateTime iso={row.reviewedAt} />
            </p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
