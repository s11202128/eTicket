"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { useCategoriesAdmin } from "@/features/admin/viewmodel/useCategoriesAdmin";

export default function CategoriesScreen() {
  const vm = useCategoriesAdmin();
  const { data, error, isLoading, reload } = vm.categories;

  return (
    <>
      <PageHeader title="Categories" description="Used to group events and as filter chips on the public site." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Category list">
          {error ? <ErrorState message={error} onRetry={reload} /> : null}
          {isLoading && !data ? (
            <SkeletonRows rows={5} label="Loading categories" />
          ) : data && data.length === 0 ? (
            <EmptyState icon="🏷" title="No categories yet" description="Add categories like Music, Sports or Comedy with the form." />
          ) : data ? (
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Order</Th>
                  <Th>Events</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {data.map((category) => (
                  <tr key={category.id}>
                    <Td className="font-medium">{category.name}</Td>
                    <Td className="font-mono text-xs text-muted">{category.slug}</Td>
                    <Td className="tabular-nums">{category.sortOrder}</Td>
                    <Td className="tabular-nums">{category.eventCount ?? 0}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => vm.startEdit(category)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => vm.setDeleteTarget(category)}>
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : null}
        </section>

        <Card className="grid content-start gap-4">
          <CardTitle>{vm.editingId ? "Edit category" : "Add category"}</CardTitle>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void vm.onSubmit();
            }}
          >
            <Field label="Name" required error={vm.errors.name}>
              {(props) => <Input {...props} maxLength={60} value={vm.draft.name} onChange={(event) => vm.setName(event.target.value)} />}
            </Field>
            <Field label="Slug" required error={vm.errors.slug} hint="Used in links, e.g. /events?category=music">
              {(props) => <Input {...props} maxLength={60} value={vm.draft.slug} onChange={(event) => vm.setSlug(event.target.value)} />}
            </Field>
            <Field label="Sort order" error={vm.errors.sortOrder} hint="Lower numbers show first.">
              {(props) => (
                <Input {...props} type="number" step="1" value={vm.draft.sortOrder} onChange={(event) => vm.setSortOrder(event.target.value)} />
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={vm.isSaving}>
                {vm.editingId ? "Save" : "Add category"}
              </Button>
              {vm.editingId ? (
                <Button variant="secondary" onClick={vm.resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>

      <ConfirmDialog
        open={vm.deleteTarget !== null}
        title={`Delete "${vm.deleteTarget?.name ?? ""}"?`}
        description={
          vm.deleteTarget?.eventCount
            ? `${vm.deleteTarget.eventCount} event${vm.deleteTarget.eventCount === 1 ? "" : "s"} will become uncategorised. The events themselves are kept.`
            : "This category has no events."
        }
        confirmLabel="Delete category"
        isLoading={vm.isDeleting}
        onConfirm={() => void vm.confirmDelete()}
        onCancel={() => vm.setDeleteTarget(null)}
      />
    </>
  );
}
