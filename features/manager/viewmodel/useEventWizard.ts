"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { editMode, type EditMode } from "@/features/manager/model/eventTabs";
import {
  liveChangeSummary,
  validateForSubmit,
  validateStep,
  WIZARD_STEPS,
  type TicketTypeValues,
  type WizardErrors,
  type WizardStep,
  type WizardValues,
} from "@/features/manager/model/eventWizard";
import {
  createDraft,
  getEditableEvent,
  listCategories,
  saveDraft,
  submitForReview,
  updateLiveEvent,
  uploadEventImage,
  type EventMeta,
} from "@/features/manager/model/managerEvents.repository";
import { useToast } from "@/components/ui/Toast";
import type { PublicOrganizer } from "@/features/events/model/events.types";
import { getMyApplication, organizerLogoUrl } from "@/features/organizer/model/organizer.repository";

const AUTOSAVE_DELAY_MS = 1500;

export type SaveState = "idle" | "saving" | "saved" | "error";

const newKey = () => crypto.randomUUID();

const emptyTicketType = (name = ""): TicketTypeValues => ({
  id: null,
  key: newKey(),
  name,
  price: "",
  quantity: "",
  salesStart: "",
  salesEnd: "",
  sold: 0,
});

const EMPTY_VALUES: WizardValues = {
  title: "",
  categoryId: "",
  description: "",
  startsAt: "",
  endAt: "",
  location: "",
  region: "solomon_islands",
  maxTicketsPerUser: "4",
  ticketTypes: [emptyTicketType("General Admission")],
  imagePath: null,
};

export function useEventWizard(initialEventId: string | null) {
  const router = useRouter();
  const toast = useToast();

  const [eventId, setEventId] = useState(initialEventId);
  const [meta, setMeta] = useState<EventMeta | null>(null);
  const [original, setOriginal] = useState<WizardValues | null>(null);
  const [values, setValues] = useState<WizardValues>(EMPTY_VALUES);
  const [isLoading, setIsLoading] = useState(Boolean(initialEventId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  // "Hosted by" in the page preview.
  const [host, setHost] = useState<PublicOrganizer | null>(null);

  const [step, setStep] = useState<WizardStep>("basics");
  const [errors, setErrors] = useState<WizardErrors>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Autosave bookkeeping: every edit bumps the version; saves record what they saved.
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const saving = useRef(false);
  const removedTypeIds = useRef<string[]>([]);
  const valuesRef = useRef(values);
  const eventIdRef = useRef(eventId);
  useEffect(() => {
    valuesRef.current = values;
    eventIdRef.current = eventId;
  });

  const mode: EditMode = meta ? editMode(meta.status) : "draft";

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    getMyApplication()
      .then((profile) => {
        if (!profile) return;
        setHost({
          id: profile.userId,
          name: profile.organizationName,
          logoUrl: profile.logoPath ? organizerLogoUrl(profile.logoPath) : null,
          description: profile.description,
          website: profile.website,
          city: profile.city,
        });
      })
      .catch(() => setHost(null));
  }, []);

  useEffect(() => {
    if (!initialEventId) return;
    let cancelled = false;
    getEditableEvent(initialEventId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setLoadError("Event not found, or it isn't yours.");
          return;
        }
        setMeta(result.meta);
        setOriginal(result.values);
        setValues(result.values);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(caught instanceof Error ? caught.message : "Couldn't load the event.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialEventId]);

  // ---------------------------------------------------------------------------
  // Editing
  // ---------------------------------------------------------------------------
  const update = useCallback((patch: Partial<WizardValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
    setVersion((value) => value + 1);
  }, []);

  const updateTicketType = (key: string, patch: Partial<TicketTypeValues>) => {
    setValues((current) => ({
      ...current,
      ticketTypes: current.ticketTypes.map((type) => (type.key === key ? { ...type, ...patch } : type)),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.ticketTypes;
      const index = valuesRef.current.ticketTypes.findIndex((type) => type.key === key);
      for (const field of Object.keys(patch)) delete next[`ticketTypes.${index}.${field}`];
      return next;
    });
    setVersion((value) => value + 1);
  };

  const addTicketType = () => {
    update({ ticketTypes: [...valuesRef.current.ticketTypes, emptyTicketType()] });
  };

  const removeTicketType = (key: string) => {
    const type = valuesRef.current.ticketTypes.find((item) => item.key === key);
    if (!type || type.sold > 0) return;
    if (type.id) removedTypeIds.current.push(type.id);
    // Errors are indexed by position, so clear ticket errors after removing a row.
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith("ticketTypes"))));
    update({ ticketTypes: valuesRef.current.ticketTypes.filter((item) => item.key !== key) });
  };

  // ---------------------------------------------------------------------------
  // Autosave (drafts only; live events save explicitly)
  // ---------------------------------------------------------------------------
  const save = useCallback(async (): Promise<boolean> => {
    if (saving.current) return false;
    const snapshotVersion = version;
    const snapshot = valuesRef.current;
    let id = eventIdRef.current;

    if (!id && snapshot.title.trim().length < 3) return false;

    saving.current = true;
    setSaveState("saving");
    setSaveError(null);
    try {
      if (!id) {
        const created = await createDraft(snapshot);
        if (!created.ok) {
          setSaveState("error");
          setSaveError(created.errorMessage);
          return false;
        }
        id = created.id;
        eventIdRef.current = id;
        setEventId(id);
        // Keep the wizard state; just give the draft its own address.
        window.history.replaceState(null, "", `/manager/events/${id}/edit`);
      }

      const removed = [...removedTypeIds.current];
      const result = await saveDraft(id, snapshot, removed);
      if (!result.ok) {
        setSaveState("error");
        setSaveError(result.errorMessage);
        return false;
      }
      removedTypeIds.current = removedTypeIds.current.filter((typeId) => !removed.includes(typeId));
      if (Object.keys(result.newTypeIds).length > 0) {
        setValues((current) => ({
          ...current,
          ticketTypes: current.ticketTypes.map((type) =>
            result.newTypeIds[type.key] ? { ...type, id: result.newTypeIds[type.key] } : type
          ),
        }));
      }
      setSavedVersion((current) => Math.max(current, snapshotVersion));
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      setSaveError("Couldn't save. Check your connection.");
      return false;
    } finally {
      saving.current = false;
    }
  }, [version]);

  useEffect(() => {
    if (mode !== "draft" || isLoading || version === savedVersion) return;
    const timer = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mode, isLoading, version, savedVersion, save]);

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------
  const stepIndex = WIZARD_STEPS.findIndex((item) => item.id === step);

  const goTo = (target: WizardStep) => {
    const targetIndex = WIZARD_STEPS.findIndex((item) => item.id === target);
    // Moving forward validates the steps in between.
    for (let index = stepIndex; index < targetIndex; index++) {
      const stepErrors = validateStep(WIZARD_STEPS[index].id, values, new Date());
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setStep(WIZARD_STEPS[index].id);
        return;
      }
    }
    setErrors({});
    setStep(target);
    if (mode === "draft" && version !== savedVersion) void save();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (stepIndex < WIZARD_STEPS.length - 1) goTo(WIZARD_STEPS[stepIndex + 1].id);
  };
  const back = () => {
    if (stepIndex > 0) {
      setStep(WIZARD_STEPS[stepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ---------------------------------------------------------------------------
  // Image
  // ---------------------------------------------------------------------------
  const uploadCover = async (file: File) => {
    setIsUploading(true);
    try {
      const result = await uploadEventImage(file);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      update({ imagePath: result.path });
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Submit (drafts) / save changes (live events)
  // ---------------------------------------------------------------------------
  const liveSummary = useMemo(
    () => (mode === "live" && original ? liveChangeSummary(original, values) : null),
    [mode, original, values]
  );

  const submit = async () => {
    if (isSubmitting) return;
    const { errors: submitErrors, firstStep } = validateForSubmit(values, new Date());
    if (firstStep) {
      setErrors(submitErrors);
      setStep(firstStep);
      setSubmitError("Some details still need attention.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === "live") {
        if (!eventId || !original || !liveSummary?.changed) return;
        const result = await updateLiveEvent(eventId, original, values);
        if (!result.ok) {
          setSubmitError(result.errorMessage);
          return;
        }
        toast.show(result.requiresReview ? "Changes saved. Your event is back in review." : "Changes saved.", "success");
        router.push(`/manager/events/${eventId}`);
        return;
      }

      // Make sure the latest edits are saved before submitting.
      while (saving.current) await new Promise((resolve) => setTimeout(resolve, 150));
      const saved = await save();
      const id = eventIdRef.current;
      if (!id || !saved) {
        setSubmitError(saveError ?? "Couldn't save your event. Please try again.");
        return;
      }
      const result = await submitForReview(id);
      if (!result.ok) {
        setSubmitError(result.errorMessage);
        return;
      }
      toast.show("Submitted for approval. We'll notify you when it's reviewed.", "success");
      router.push(`/manager/events/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    eventId,
    meta,
    mode,
    isLoading,
    loadError,
    categories,
    host,
    values,
    errors,
    step,
    stepIndex,
    steps: WIZARD_STEPS,
    update,
    updateTicketType,
    addTicketType,
    removeTicketType,
    goTo,
    next,
    back,
    saveState,
    saveError,
    isDirty: version !== savedVersion,
    isUploading,
    uploadCover,
    liveSummary,
    isSubmitting,
    submitError,
    submit,
  };
}

export type EventWizardViewModel = ReturnType<typeof useEventWizard>;
