"use client";

import { useEffect, useState } from "react";
import { validateImage } from "@/lib/storage";
import {
  EMPTY_ORGANIZER_FORM,
  validateOrganizerForm,
  type OrganizerFormErrors,
  type OrganizerFormValues,
} from "@/features/organizer/model/organizer.schema";

export type OrganizerFormState = {
  values: OrganizerFormValues;
  errors: OrganizerFormErrors;
  logoFile: File | null;
  logoPreview: string | null;
  logoError: string | null;
  setField: <K extends keyof OrganizerFormValues>(key: K, value: OrganizerFormValues[K]) => void;
  toggleEventType: (type: string) => void;
  setLogo: (file: File | null) => void;
  reset: (values: OrganizerFormValues, logoUrl?: string | null) => void;
  validate: () => ReturnType<typeof validateOrganizerForm>;
};

// Form state shared by the signup "Host events" step and the application page.
export function useOrganizerForm(initial: OrganizerFormValues = EMPTY_ORGANIZER_FORM): OrganizerFormState {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<OrganizerFormErrors>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Free the preview's memory when it's replaced or the form goes away.
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const setField: OrganizerFormState["setField"] = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const toggleEventType = (type: string) => {
    setField(
      "eventTypes",
      values.eventTypes.includes(type) ? values.eventTypes.filter((item) => item !== type) : [...values.eventTypes, type]
    );
  };

  const setLogo = (file: File | null) => {
    if (file) {
      const problem = validateImage(file, "organizer-logos");
      if (problem) {
        setLogoError(problem);
        return;
      }
    }
    setLogoError(null);
    setLogoFile(file);
    setObjectUrl(file ? URL.createObjectURL(file) : null);
  };

  const reset: OrganizerFormState["reset"] = (next, logoUrl = null) => {
    setValues(next);
    setErrors({});
    setLogoFile(null);
    setObjectUrl(null);
    setLogoError(null);
    setExistingLogo(logoUrl);
  };

  const validate = () => {
    const result = validateOrganizerForm(values);
    setErrors(result.ok ? {} : result.errors);
    return result;
  };

  return {
    values,
    errors,
    logoFile,
    logoPreview: objectUrl ?? existingLogo,
    logoError,
    setField,
    toggleEventType,
    setLogo,
    reset,
    validate,
  };
}
