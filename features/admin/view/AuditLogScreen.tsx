"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import type { Json } from "@/lib/database.types";
import { useAsyncData } from "@/lib/useAsyncData";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import { listAuditLog, type AuditFilters, type AuditRow } from "@/features/admin/model/reviews.repository";

const PAGE_SIZE = 30;

const ACTIONS: { value: string; label: string }[] = [
  { value: "organizer.applied", label: "Organizer applied" },
  { value: "organizer.application_updated", label: "Application updated" },
  { value: "organizer.reapplied", label: "Organizer reapplied" },
  { value: "organizer.approve", label: "Organizer approved" },
  { value: "organizer.reject", label: "Organizer rejected" },
  { value: "organizer.suspend", label: "Organizer suspended" },
  { value: "organizer.profile_updated", label: "Organizer profile updated" },
  { value: "event.submitted", label: "Event submitted" },
  { value: "event.approve", label: "Event approved" },
  { value: "event.request_changes", label: "Changes requested" },
  { value: "event.reject", label: "Event rejected" },
  { value: "event.updated_live", label: "Live event edited" },
  { value: "event.cancellation_requested", label: "Cancellation requested" },
  { value: "event.cancellation_declined", label: "Cancellation declined" },
  { value: "event.cancelled", label: "Event cancelled" },
  { value: "event.staff_added", label: "Door staff added" },
];
const ACTION_LABELS = new Map(ACTIONS.map((item) => [item.value, item.label]));

function targetLink(row: AuditRow): string | null {
  if (!row.targetId) return null;
  if (row.targetType === "event") return `/admin/reviews/${row.targetId}`;
  return null;
}

// Short readable summary of the details JSON.
function summarize(details: Json): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

export default function AuditLogScreen() {
  const [filters, setFilters] = useState<AuditFilters>({ action: "", targetType: "", from: "", to: "", page: 1 });
  const { data, error, isLoading, reload } = useAsyncData(() => listAuditLog(filters, PAGE_SIZE), JSON.stringify(filters));
  const update = (patch: Partial<AuditFilters>) => setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <>
      <PageHeader title="Audit log" description="Every approval, review, cancellation and team change, newest first." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Action">
          {(props) => (
            <Select {...props} value={filters.action} onChange={(event) => update({ action: event.target.value })}>
              <option value="">All actions</option>
              {ACTIONS.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Type">
          {(props) => (
            <Select {...props} value={filters.targetType} onChange={(event) => update({ targetType: event.target.value })}>
              <option value="">Everything</option>
              <option value="event">Events</option>
              <option value="organizer">Organizers</option>
            </Select>
          )}
        </Field>
        <Field label="From">
          {(props) => <Input {...props} type="date" value={filters.from} onChange={(event) => update({ from: event.target.value })} />}
        </Field>
        <Field label="To">
          {(props) => <Input {...props} type="date" value={filters.to} onChange={(event) => update({ to: event.target.value })} />}
        </Field>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={10} label="Loading audit log" />
      ) : data.rows.length === 0 ? (
        <EmptyState icon="📜" title="No entries" description="Try different filters." />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>By</Th>
                <Th>Details</Th>
              </tr>
            </THead>
            <TBody>
              {data.rows.map((row) => {
                const href = targetLink(row);
                return (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap text-xs">
                      <LocalDateTime iso={row.createdAt} />
                    </Td>
                    <Td className="whitespace-nowrap font-semibold">
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {ACTION_LABELS.get(row.action) ?? row.action}
                        </Link>
                      ) : (
                        (ACTION_LABELS.get(row.action) ?? row.action)
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-sm">{row.actorName ?? "System"}</Td>
                    <Td className="max-w-md text-xs text-muted">{summarize(row.details)}</Td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={filters.page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(page) => update({ page })} />
        </>
      )}
    </>
  );
}
