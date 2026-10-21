"use client";

import { useState } from "react";
import { useConfirm } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import { EMPTY_ADDON, moveItem, validateAddon, type AddonValues, type FormErrors } from "@/features/manager/model/eventExtras";
import {
  createEventAddon,
  deleteEventAddon,
  listEventAddons,
  reorderEventAddons,
  setEventAddonActive,
  updateEventAddon,
  type EventAddon,
} from "@/features/manager/model/addons.repository";

function toValues(addon: EventAddon): AddonValues {
  return {
    name: addon.name,
    description: addon.description ?? "",
    price: String(addon.price),
    quantity: addon.quantity === null ? "" : String(addon.quantity),
    isActive: addon.isActive,
  };
}

export function useEventAddons(eventId: string) {
  const toast = useToast();
  const list = useAsyncData(() => listEventAddons(eventId), `event-addons-${eventId}`);
  // null = form closed; "new" = adding; otherwise the add-on being edited.
  const [editing, setEditing] = useState<null | "new" | EventAddon>(null);
  const [values, setValues] = useState<AddonValues>(EMPTY_ADDON);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmDelete = useConfirm<EventAddon>();
  // The moved list, shown while the new order saves.
  const [reordered, setReordered] = useState<EventAddon[] | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  // Read out after each move, for screen readers.
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const addons = reordered ?? list.data ?? [];

  const open = (addon: EventAddon | null) => {
    setEditing(addon ?? "new");
    setValues(addon ? toValues(addon) : EMPTY_ADDON);
    setErrors({});
  };

  const save = async () => {
    if (!editing || isSaving) return;
    const sold = editing === "new" ? 0 : editing.sold;
    const found = validateAddon(values, sold);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      const nextOrder = addons.reduce((max, addon) => Math.max(max, addon.sortOrder + 1), 0);
      const result =
        editing === "new" ? await createEventAddon(eventId, values, nextOrder) : await updateEventAddon(editing.id, values, sold);
      if (!result.ok) {
        if (/name already exists/.test(result.errorMessage)) setErrors({ name: result.errorMessage });
        else toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(editing === "new" ? `${values.name.trim()} added.` : "Add-on saved.", "success");
      setEditing(null);
      await list.reload();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (addon: EventAddon) => {
    setToggling(addon.id);
    try {
      const result = await setEventAddonActive(addon.id, !addon.isActive);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(addon.isActive ? `${addon.name} hidden from buyers.` : `${addon.name} is on sale.`, "success");
      await list.reload();
    } finally {
      setToggling(null);
    }
  };

  // Moves an add-on one step (-1 up, +1 down) straight away, then saves.
  // On failure the list goes back to how it was saved.
  const move = async (addon: EventAddon, direction: -1 | 1) => {
    if (isReordering) return;
    const index = addons.findIndex((item) => item.id === addon.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= addons.length) return;
    const next = moveItem(addons, index, direction);

    setReordered(next.map((item, position) => ({ ...item, sortOrder: position })));
    setMoveAnnouncement(`${addon.name} moved to position ${target + 1} of ${next.length}.`);
    setIsReordering(true);
    try {
      const result = await reorderEventAddons(next);
      if (!result.ok) {
        setReordered(null);
        setMoveAnnouncement(`Couldn't move ${addon.name}.`);
        toast.show(result.errorMessage, "error");
      }
      // Reload either way: a failed save may have moved some rows.
      await list.reload();
    } finally {
      setReordered(null);
      setIsReordering(false);
    }
  };

  const remove = async () => {
    const addon = confirmDelete.pending;
    if (!addon) return;
    setIsDeleting(true);
    try {
      const result = await deleteEventAddon(addon.id);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(`${addon.name} deleted.`, "success");
      confirmDelete.close();
      await list.reload();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    addons,
    isLoading: list.isLoading,
    error: list.error,
    reload: list.reload,
    editing,
    openNew: () => open(null),
    openEdit: (addon: EventAddon) => open(addon),
    close: () => setEditing(null),
    values,
    setField: <K extends keyof AddonValues>(key: K, value: AddonValues[K]) => {
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
    isReordering,
    moveUp: (addon: EventAddon) => void move(addon, -1),
    moveDown: (addon: EventAddon) => void move(addon, 1),
    moveAnnouncement,
    confirmDelete,
    isDeleting,
    remove,
  };
}

export type EventAddonsViewModel = ReturnType<typeof useEventAddons>;
