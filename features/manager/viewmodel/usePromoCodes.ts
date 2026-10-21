"use client";

import { useState } from "react";
import { useConfirm } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { toDateTimeLocalValue } from "@/lib/format";
import { useAsyncData } from "@/lib/useAsyncData";
import { EMPTY_PROMO_CODE, normalizePromoCode, validatePromoCode, type FormErrors, type PromoCodeValues } from "@/features/manager/model/eventExtras";
import {
  createPromoCode,
  deletePromoCode,
  listPromoCodes,
  setPromoCodeActive,
  updatePromoCode,
  type PromoCode,
} from "@/features/manager/model/promoCodes.repository";

const toLocal = (iso: string | null) => (iso ? toDateTimeLocalValue(iso) : "");

function toValues(code: PromoCode): PromoCodeValues {
  return {
    code: code.code,
    discountType: code.discountType,
    discountValue: String(code.discountValue),
    maxUses: code.maxUses === null ? "" : String(code.maxUses),
    startsAt: toLocal(code.startsAt),
    endsAt: toLocal(code.endsAt),
    isActive: code.isActive,
  };
}

export function usePromoCodes(eventId: string) {
  const toast = useToast();
  const list = useAsyncData(() => listPromoCodes(eventId), `promo-codes-${eventId}`);
  // null = form closed; "new" = adding; otherwise the code being edited.
  const [editing, setEditing] = useState<null | "new" | PromoCode>(null);
  const [values, setValues] = useState<PromoCodeValues>(EMPTY_PROMO_CODE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmDelete = useConfirm<PromoCode>();

  const open = (code: PromoCode | null) => {
    setEditing(code ?? "new");
    setValues(code ? toValues(code) : EMPTY_PROMO_CODE);
    setErrors({});
  };

  const save = async () => {
    if (!editing || isSaving) return;
    const uses = editing === "new" ? 0 : editing.uses;
    const found = validatePromoCode(values, uses);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      const result = editing === "new" ? await createPromoCode(eventId, values) : await updatePromoCode(editing.id, values, uses);
      if (!result.ok) {
        // A taken code belongs next to the field.
        if (/code already exists/.test(result.errorMessage)) setErrors({ code: result.errorMessage });
        else toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(editing === "new" ? `${normalizePromoCode(values.code)} added.` : "Promo code saved.", "success");
      setEditing(null);
      await list.reload();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (code: PromoCode) => {
    setToggling(code.id);
    try {
      const result = await setPromoCodeActive(code.id, !code.isActive);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(code.isActive ? `${code.code} paused.` : `${code.code} is active.`, "success");
      await list.reload();
    } finally {
      setToggling(null);
    }
  };

  const remove = async () => {
    const code = confirmDelete.pending;
    if (!code) return;
    setIsDeleting(true);
    try {
      const result = await deletePromoCode(code.id);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(`${code.code} deleted.`, "success");
      confirmDelete.close();
      await list.reload();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    codes: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error,
    reload: list.reload,
    editing,
    openNew: () => open(null),
    openEdit: (code: PromoCode) => open(code),
    close: () => setEditing(null),
    values,
    setField: <K extends keyof PromoCodeValues>(key: K, value: PromoCodeValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
      setErrors((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    errors,
    isSaving,
    save,
    toggling,
    toggleActive,
    confirmDelete,
    isDeleting,
    remove,
  };
}

export type PromoCodesViewModel = ReturnType<typeof usePromoCodes>;
