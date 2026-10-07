import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/database.types";
import { ilikePattern, pageRange, sanitizeSearch } from "@/lib/search";
import type { ActionResult, AdminUserRow, Paged } from "@/features/admin/model/admin.types";

export type UserFilters = {
  search: string;
  role: UserRole | "all";
  page: number;
};

export async function listUsers(filters: UserFilters, pageSize = 20): Promise<Paged<AdminUserRow>> {
  const [from, to] = pageRange(filters.page, pageSize);
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const search = sanitizeSearch(filters.search);
  if (search) {
    const pattern = ilikePattern(search);
    query = query.or(`email.ilike."${pattern}",full_name.ilike."${pattern}"`);
  }
  if (filters.role !== "all") query = query.eq("role", filters.role);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const { data: eligible, error: eligibleError } = await supabase.rpc("list_admin_eligible", {
    p_user_ids: data.map((profile) => profile.id),
  });
  if (eligibleError) throw new Error(eligibleError.message);
  const canBeAdmin = new Set(eligible.map((row) => row.user_id));

  return {
    rows: data.map((profile) => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role as UserRole,
      createdAt: profile.created_at,
      canBeAdmin: canBeAdmin.has(profile.id),
    })),
    total: count ?? 0,
  };
}

// The database trigger rejects non-admins, admins demoting themselves and
// the admin role for emails that aren't on the authorized admin list.
export async function setUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", userId).select("id");
  if (error) return { ok: false, errorMessage: error.message };
  if (data.length === 0) return { ok: false, errorMessage: "User not found." };
  return { ok: true, data: undefined };
}
