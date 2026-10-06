"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { UserRole } from "@/lib/database.types";
import { useAsyncData } from "@/lib/useAsyncData";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { getCurrentUserId } from "@/features/auth/model/session.repository";
import { listUsers, setUserRole, type UserFilters } from "@/features/admin/model/users.repository";
import type { AdminUserRow } from "@/features/admin/model/admin.types";

export const USERS_PAGE_SIZE = 25;

type PendingChange = { user: AdminUserRow; role: UserRole };

export function useAdminUsers() {
  const toast = useToast();
  const [filters, setFilters] = useState<UserFilters>({ search: "", role: "all", page: 1 });
  const search = useDebouncedValue(filters.search);
  const effective = { ...filters, search };
  const users = useAsyncData(() => listUsers(effective, USERS_PAGE_SIZE), JSON.stringify(effective));

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void getCurrentUserId().then(setCurrentUserId);
  }, []);

  const updateFilter = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? (value as number) : 1 }));
  };

  const confirmRoleChange = async () => {
    if (!pending) return;
    setIsSaving(true);
    const result = await setUserRole(pending.user.id, pending.role);
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(`${pending.user.email ?? "User"} is now ${pending.role}.`);
    setPending(null);
    await users.reload();
  };

  return {
    filters,
    updateFilter,
    users,
    currentUserId,
    pending,
    requestRoleChange: (user: AdminUserRow, role: UserRole) => {
      if (role !== user.role) setPending({ user, role });
    },
    cancelRoleChange: () => setPending(null),
    confirmRoleChange,
    isSaving,
  };
}
