"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { slugify, toDateTimeLocalValue } from "@/lib/format";
import { eventImageSrc, uploadImage, validateImage } from "@/lib/storage";
import {
  createAdminEvent,
  getAdminEvent,
  getEventSoldCount,
  updateAdminEvent,
} from "@/features/admin/model/adminEvents.repository";
import { listCategories } from "@/features/admin/model/categories.repository";
import {
  validateEventForm,
  type EventFormErrors,
  type EventFormInput,
} from "@/features/admin/model/eventForm.schema";
import type { Category } from "@/features/admin/model/admin.types";
import type { EventStatus } from "@/lib/database.types";
import { isEventRegion } from "@/lib/regions";

const EMPTY_FORM: EventFormInput = {
  title: "",
  slug: "",
  description: "",
  startsAt: "",
  endAt: "",
  location: "",
  price: "0",
  capacity: "",
  maxTicketsPerUser: "4",
  categoryId: "",
  region: "solomon_islands",
  imagePath: null,
  status: "draft",
  isFeatured: false,
};

export function useEventEditor(eventId?: string) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<EventFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(eventId));
  const [isDirty, setIsDirty] = useState(false);
  const [sold, setSold] = useState(0);
  const [legacyImageUrl, setLegacyImageUrl] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<EventStatus>("draft");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [categoryList, event, soldCount] = await Promise.all([
          listCategories(),
          eventId ? getAdminEvent(eventId) : Promise.resolve(null),
          eventId ? getEventSoldCount(eventId) : Promise.resolve(0),
        ]);
        if (!active) return;
        setCategories(categoryList);

        if (eventId) {
          if (!event) {
            setLoadError("Event not found.");
            return;
          }
          setSold(soldCount);
          setLegacyImageUrl(event.image_url);
          setCurrentStatus(event.status as EventStatus);
          setValues({
            title: event.title,
            slug: event.slug,
            description: event.description ?? "",
            startsAt: toDateTimeLocalValue(event.starts_at),
            endAt: event.end_at ? toDateTimeLocalValue(event.end_at) : "",
            location: event.location,
            price: String(event.price),
            capacity: event.capacity === null ? "" : String(event.capacity),
            maxTicketsPerUser: String(event.max_tickets_per_user),
            categoryId: event.category_id ?? "",
            region: isEventRegion(event.region) ? event.region : "solomon_islands",
            imagePath: event.image_path,
            // Cancelled events are edited as published; cancelling is its own action.
            status: event.status === "draft" ? "draft" : "published",
            isFeatured: event.is_featured,
          });
        }
      } catch (caught) {
        if (active) setLoadError(caught instanceof Error ? caught.message : "Couldn't load the event.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [eventId]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const setField = <K extends keyof EventFormInput>(key: K, value: EventFormInput[K]) => {
    setIsDirty(true);
    setErrors((current) => ({ ...current, [key]: undefined }));
    setValues((current) => {
      const next = { ...current, [key]: value };
      // Slug follows the title until it is edited by hand.
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  };

  const onSlugChange = (value: string) => {
    setSlugTouched(true);
    setField("slug", value.toLowerCase().replace(/\s+/g, "-"));
  };

  const onImageSelected = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file, "event-images");
    if (problem) {
      setErrors((current) => ({ ...current, imagePath: problem }));
      return;
    }
    setIsUploading(true);
    const result = await uploadImage("event-images", file, eventId ?? "new");
    setIsUploading(false);
    if (!result.ok) {
      setErrors((current) => ({ ...current, imagePath: result.errorMessage }));
      toast.error(`Upload failed: ${result.errorMessage}`);
      return;
    }
    setField("imagePath", result.path);
  };

  const removeImage = () => {
    setField("imagePath", null);
    setLegacyImageUrl(null);
  };

  const imagePreview = useMemo(
    () => (values.imagePath || legacyImageUrl ? eventImageSrc(values.imagePath, legacyImageUrl) : null),
    [values.imagePath, legacyImageUrl]
  );

  const onSubmit = async () => {
    const validation = validateEventForm(values);
    if (!validation.ok) {
      setErrors(validation.errors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const { capacity } = validation.data;
    if (capacity !== null && capacity < sold) {
      setErrors({ capacity: `Capacity can't be lower than the ${sold} tickets already sold.` });
      return;
    }

    setIsSaving(true);
    const result = eventId
      ? await updateAdminEvent(eventId, validation.data, { keepStatus: currentStatus === "cancelled" })
      : await createAdminEvent(validation.data);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.errorMessage);
      if (result.errorMessage.toLowerCase().includes("slug")) {
        setErrors({ slug: result.errorMessage });
      }
      return;
    }

    setIsDirty(false);
    toast.success(eventId ? "Event saved." : "Event created.");
    if (result.data && "ticketTypesSkipped" in result.data && result.data.ticketTypesSkipped) {
      toast.show("Price and capacity weren't changed: this event has several ticket types.", "info");
    }
    router.push("/admin/events");
  };

  return {
    mode: eventId ? ("edit" as const) : ("create" as const),
    values,
    errors,
    categories,
    isLoading,
    loadError,
    isSaving,
    isUploading,
    sold,
    currentStatus,
    imagePreview,
    setField,
    onSlugChange,
    onImageSelected,
    removeImage,
    onSubmit,
  };
}
