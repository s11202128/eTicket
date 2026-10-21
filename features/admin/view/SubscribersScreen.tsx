"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import { SUBSCRIBERS_PAGE_SIZE, useSubscribers } from "@/features/admin/viewmodel/useSubscribers";

export default function SubscribersScreen() {
  const vm = useSubscribers();
  const count = vm.subscriberCount;

  return (
    <>
      <PageHeader
        title="Subscribers"
        description={
          count === null
            ? "People who signed up for the newsletter on the homepage."
            : `${count} ${count === 1 ? "person has" : "people have"} signed up for the newsletter on the homepage.`
        }
        actions={
          <Button variant="secondary" onClick={() => void vm.exportCsv()} isLoading={vm.isExporting} disabled={count === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4">
        <section aria-label="Search" className="rounded-lg border border-border bg-surface p-4">
          <Field label="Search" hint={vm.searchInput ? "Export CSV exports the matching subscribers only." : "Email address"}>
            {(props) => (
              <Input {...props} type="search" value={vm.searchInput} onChange={(event) => vm.setSearch(event.target.value)} />
            )}
          </Field>
        </section>

        {vm.error ? (
          <ErrorState message={vm.error} onRetry={() => void vm.reload()} />
        ) : vm.isLoading ? (
          <SkeletonRows rows={6} label="Loading subscribers" />
        ) : vm.rows.length === 0 ? (
          <EmptyState
            icon="📮"
            title={vm.search ? "No subscribers match this search" : "No subscribers yet"}
            description={vm.search ? "Try a different email address." : "Sign-ups from the newsletter form appear here."}
            action={
              vm.search ? (
                <Button variant="secondary" onClick={() => vm.setSearch("")}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3">
            <Table>
              <THead>
                <tr>
                  <Th>Email</Th>
                  <Th>Subscribed</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {vm.rows.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <Td className="font-medium">
                      <a href={`mailto:${subscriber.email}`} className="break-all hover:underline">
                        {subscriber.email}
                      </a>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      <LocalDateTime iso={subscriber.createdAt} />
                    </Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => vm.setRemoveTarget(subscriber)}>
                        Remove
                      </Button>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={vm.page} pageSize={SUBSCRIBERS_PAGE_SIZE} total={vm.total} onPageChange={vm.setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={vm.removeTarget !== null}
        title={`Remove ${vm.removeTarget?.email ?? "this subscriber"}?`}
        description="They won't get the newsletter any more. They can sign up again on the homepage."
        confirmLabel="Remove subscriber"
        isLoading={vm.isRemoving}
        onConfirm={() => void vm.confirmRemove()}
        onCancel={() => vm.setRemoveTarget(null)}
      />
    </>
  );
}
