"use client";

import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { slugify } from "@/lib/format";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/features/admin/model/categories.repository";
import type { Category } from "@/features/admin/model/admin.types";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60, "Keep it under 60 characters."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes."),
  sortOrder: z.coerce.number().int("Use a whole number."),
});

type Draft = { name: string; slug: string; sortOrder: string };
type DraftErrors = Partial<Record<keyof Draft, string>>;

const EMPTY: Draft = { name: "", slug: "", sortOrder: "0" };

export function useCategoriesAdmin() {
  const toast = useToast();
  const categories = useAsyncData(listCategories, "categories");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const setName = (name: string) => {
    setErrors({});
    setDraft((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }));
  };

  const setSlug = (slug: string) => {
    setSlugTouched(true);
    setErrors({});
    setDraft((current) => ({ ...current, slug: slug.toLowerCase().replace(/\s+/g, "-") }));
  };

  const setSortOrder = (sortOrder: string) => setDraft((current) => ({ ...current, sortOrder }));

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setSlugTouched(true);
    setErrors({});
    setDraft({ name: category.name, slug: category.slug, sortOrder: String(category.sortOrder) });
  };

  const resetForm = () => {
    setEditingId(null);
    setSlugTouched(false);
    setErrors({});
    setDraft(EMPTY);
  };

  const onSubmit = async () => {
    const parsed = categorySchema.safeParse(draft);
    if (!parsed.success) {
      const next: DraftErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Draft;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setIsSaving(true);
    const result = editingId ? await updateCategory(editingId, parsed.data) : await createCategory(parsed.data);
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(editingId ? "Category updated." : "Category added.");
    resetForm();
    await categories.reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteCategory(deleteTarget.id);
    setIsDeleting(false);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(`"${deleteTarget.name}" deleted.`);
    if (editingId === deleteTarget.id) resetForm();
    setDeleteTarget(null);
    await categories.reload();
  };

  return {
    categories,
    editingId,
    draft,
    errors,
    isSaving,
    setName,
    setSlug,
    setSortOrder,
    startEdit,
    resetForm,
    onSubmit,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    confirmDelete,
  };
}
