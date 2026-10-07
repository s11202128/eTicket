"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  applicationToFormValues,
  applyAsOrganizer,
  getMyApplication,
  organizerLogoUrl,
  uploadOrganizerLogo,
  type OrganizerApplication,
} from "@/features/organizer/model/organizer.repository";
import { useOrganizerForm, type OrganizerFormState } from "@/features/organizer/viewmodel/useOrganizerForm";

export type ApplicationViewModel = {
  application: OrganizerApplication | null;
  isLoading: boolean;
  loadError: string | null;
  form: OrganizerFormState;
  // Showing the form (first application, editing while pending, reapplying).
  isEditing: boolean;
  canEdit: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  successMessage: string | null;
  startEditing: () => void;
  cancelEditing: () => void;
  onSubmit: () => Promise<void>;
};

export function useApplicationViewModel(): ApplicationViewModel {
  const router = useRouter();
  const { data, error, isLoading, reload } = useAsyncData(getMyApplication, "application");
  const application = data ?? null;
  const form = useOrganizerForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canEdit = !application || application.status === "pending" || application.status === "rejected";

  // Fill the form from the saved application once it loads.
  const { reset } = form;
  useEffect(() => {
    if (application) {
      reset(applicationToFormValues(application), application.logoPath ? organizerLogoUrl(application.logoPath) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when a new application row arrives
  }, [application?.updatedAt]);

  const startEditing = () => {
    setSuccessMessage(null);
    setSubmitError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (application) {
      reset(applicationToFormValues(application), application.logoPath ? organizerLogoUrl(application.logoPath) : null);
    }
    setSubmitError(null);
    setIsEditing(false);
  };

  const onSubmit = async () => {
    if (isSubmitting || !canEdit) return;
    const result = form.validate();
    if (!result.ok) {
      setSubmitError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let logoPath = application?.logoPath ?? null;
      if (form.logoFile) {
        const upload = await uploadOrganizerLogo(form.logoFile);
        if (!upload.ok) {
          setSubmitError(upload.errorMessage);
          return;
        }
        logoPath = upload.path;
      }

      const wasRejected = application?.status === "rejected";
      const saved = await applyAsOrganizer(result.data, logoPath);
      if (!saved.ok) {
        setSubmitError(saved.errorMessage);
        return;
      }

      setSuccessMessage(
        !application
          ? "Application sent. We'll let you know once it's reviewed."
          : wasRejected
            ? "Application resubmitted for review."
            : "Application updated."
      );
      setIsEditing(false);
      await reload();
      // Header menu shows "Organizer application" now.
      router.refresh();
    } catch {
      setSubmitError("Couldn't send your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    application,
    isLoading,
    loadError: error,
    form,
    isEditing: canEdit && (isEditing || (!isLoading && !error && !application)),
    canEdit,
    isSubmitting,
    submitError,
    successMessage,
    startEditing,
    cancelEditing,
    onSubmit,
  };
}
