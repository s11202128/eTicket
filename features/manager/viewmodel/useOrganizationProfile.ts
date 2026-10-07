"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  applicationToFormValues,
  getMyApplication,
  organizerLogoUrl,
  updateOrganizerProfile,
  uploadOrganizerLogo,
} from "@/features/organizer/model/organizer.repository";
import { useOrganizerForm } from "@/features/organizer/viewmodel/useOrganizerForm";

export function useOrganizationProfile() {
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading, reload } = useAsyncData(getMyApplication, "organization");
  const form = useOrganizerForm();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { reset } = form;
  useEffect(() => {
    if (data) reset(applicationToFormValues(data), data.logoPath ? organizerLogoUrl(data.logoPath) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when a new profile row arrives
  }, [data?.updatedAt]);

  const save = async () => {
    if (isSaving || !data) return;
    const result = form.validate();
    if (!result.ok) {
      setSaveError("Please fix the highlighted fields.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      let logoPath = data.logoPath;
      if (form.logoFile) {
        const upload = await uploadOrganizerLogo(form.logoFile);
        if (!upload.ok) {
          setSaveError(upload.errorMessage);
          return;
        }
        logoPath = upload.path;
      }
      const saved = await updateOrganizerProfile(result.data, logoPath);
      if (!saved.ok) {
        setSaveError(saved.errorMessage);
        return;
      }
      toast.show("Organization profile saved.", "success");
      await reload();
      // Sidebar and top bar show the new name and logo.
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return { profile: data, error, isLoading, form, isSaving, saveError, save };
}
