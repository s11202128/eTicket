import { supabase } from "@/lib/supabase";
import type { ActionResult, Category } from "@/features/admin/model/admin.types";

const UNIQUE_VIOLATION = "23505";

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, events(count)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);

  return data.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sort_order,
    eventCount: (category.events as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export type CategoryInput = { name: string; slug: string; sortOrder: number };

function friendly(code: string | undefined, message: string): string {
  return code === UNIQUE_VIOLATION ? "A category with that slug already exists." : message;
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  const { error } = await supabase
    .from("categories")
    .insert({ name: input.name, slug: input.slug, sort_order: input.sortOrder });
  if (error) return { ok: false, errorMessage: friendly(error.code, error.message) };
  return { ok: true, data: undefined };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const { error } = await supabase
    .from("categories")
    .update({ name: input.name, slug: input.slug, sort_order: input.sortOrder })
    .eq("id", id);
  if (error) return { ok: false, errorMessage: friendly(error.code, error.message) };
  return { ok: true, data: undefined };
}

// Events in this category become uncategorised (on delete set null).
export async function deleteCategory(id: string): Promise<ActionResult> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data: undefined };
}
