"use client";

import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/Table";
import type { UserRole } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { ErrorState, PageHeader, Pagination } from "@/features/admin/view/AdminUi";
import { RoleBadge } from "@/features/admin/view/StatusBadges";
import { USERS_PAGE_SIZE, useAdminUsers } from "@/features/admin/viewmodel/useAdminUsers";

const ROLE_HELP: Record<UserRole, string> = {
  attendee: "can browse events and book tickets.",
  organizer: "can host events (granted by approving an organizer application).",
  admin: "can open the admin dashboard and manage everything, including check-in and other users' roles.",
};

export default function UsersScreen() {
  const vm = useAdminUsers();
  const { data, error, isLoading, reload } = vm.users;

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with an account. Only emails on the authorized admin list can be admins; that list is managed in the Supabase SQL editor."
      />

      <section aria-label="Filters" className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3">
        <Field label="Search" hint="Name or email" className="sm:col-span-2">
          {(props) => (
            <Input {...props} type="search" value={vm.filters.search} onChange={(event) => vm.updateFilter("search", event.target.value)} />
          )}
        </Field>
        <Field label="Role">
          {(props) => (
            <Select {...props} value={vm.filters.role} onChange={(event) => vm.updateFilter("role", event.target.value as UserRole | "all")}>
              <option value="all">All roles</option>
              <option value="attendee">Attendee</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </Select>
          )}
        </Field>
      </section>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {isLoading && !data ? (
        <SkeletonRows rows={8} label="Loading users" />
      ) : data && data.rows.length === 0 ? (
        <EmptyState icon="👥" title="No users found" description="Try a different name or email." />
      ) : data ? (
        <div className="grid gap-3" aria-busy={isLoading}>
          <Table>
            <THead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th>Change role</Th>
              </tr>
            </THead>
            <TBody>
              {data.rows.map((user) => {
                const isSelf = user.id === vm.currentUserId;
                return (
                  <tr key={user.id}>
                    <Td className="min-w-56">
                      <p className="font-medium">
                        {user.fullName || "—"}
                        {isSelf ? <span className="ml-2 text-xs text-muted">(you)</span> : null}
                      </p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </Td>
                    <Td>
                      <RoleBadge role={user.role} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(user.createdAt)}</Td>
                    <Td>
                      <label className="sr-only" htmlFor={`role-${user.id}`}>
                        Role for {user.email}
                      </label>
                      <Select
                        id={`role-${user.id}`}
                        value={user.role}
                        disabled={isSelf}
                        title={isSelf ? "You can't change your own role." : undefined}
                        className="h-9 w-32"
                        onChange={(event) => vm.requestRoleChange(user, event.target.value as UserRole)}
                      >
                        <option value="attendee">Attendee</option>
                        {/* Organizer status comes from approving an application. */}
                        <option value="organizer" disabled>
                          Organizer
                        </option>
                        {/* Only emails on the authorized admin list (managed in Supabase). */}
                        <option value="admin" disabled={!user.canBeAdmin && user.role !== "admin"}>
                          Admin{user.canBeAdmin ? "" : " (not authorized)"}
                        </option>
                      </Select>
                    </Td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
          <Pagination
            page={vm.filters.page}
            pageSize={USERS_PAGE_SIZE}
            total={data.total}
            onPageChange={(page) => vm.updateFilter("page", page)}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={vm.pending !== null}
        title={`Make ${vm.pending?.user.email ?? "this user"} ${vm.pending?.role ?? ""}?`}
        description={vm.pending ? `A ${vm.pending.role} ${ROLE_HELP[vm.pending.role]}` : undefined}
        confirmLabel="Change role"
        tone={vm.pending?.role === "admin" ? "danger" : "primary"}
        isLoading={vm.isSaving}
        onConfirm={() => void vm.confirmRoleChange()}
        onCancel={vm.cancelRoleChange}
      />
    </>
  );
}
