"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "@/features/auth/model/auth.repository";
import type { SignupCredentials } from "@/features/auth/model/auth.types";
import { applyAsOrganizer, uploadOrganizerLogo } from "@/features/organizer/model/organizer.repository";
import { useOrganizerForm, type OrganizerFormState } from "@/features/organizer/viewmodel/useOrganizerForm";

export type SignupType = "attendee" | "organizer";

// choose: the two cards; account: name/email/password; organization: step 2 for organizers.
export type SignupStep = "choose" | "account" | "organization";

export type SignupViewModel = {
  type: SignupType | null;
  step: SignupStep;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountErrors: Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;
  organizerForm: OrganizerFormState;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  loginHref: string;
  onChooseType: (type: SignupType) => void;
  onBack: () => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `next` must already be a safe same-site path (see safeNextPath).
export function useSignupViewModel(initialType: SignupType | null, next: string | null): SignupViewModel {
  const router = useRouter();
  const [type, setType] = useState<SignupType | null>(initialType);
  const [step, setStep] = useState<SignupStep>(initialType ? "account" : "choose");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountErrors, setAccountErrors] = useState<SignupViewModel["accountErrors"]>({});
  const organizerForm = useOrganizerForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loginHref = useMemo(() => {
    const params = new URLSearchParams();
    if (type === "organizer") params.set("mode", "manager");
    if (next) params.set("next", next);
    const query = params.toString();
    return query ? `/login?${query}` : "/login";
  }, [type, next]);

  // Keep ?type= in the address bar so a reload stays on the same form.
  const syncUrl = (value: SignupType | null) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("type", value);
    else url.searchParams.delete("type");
    window.history.replaceState(null, "", url);
  };

  const onChooseType = (value: SignupType) => {
    setType(value);
    setStep("account");
    setError(null);
    syncUrl(value);
  };

  const onBack = () => {
    setError(null);
    if (step === "organization") {
      setStep("account");
    } else {
      setStep("choose");
      syncUrl(null);
    }
  };

  const clearError = (key: keyof SignupViewModel["accountErrors"]) =>
    setAccountErrors((current) => ({ ...current, [key]: undefined }));

  const validateAccount = () => {
    const errors: SignupViewModel["accountErrors"] = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter your name.";
    else if (fullName.trim().length > 120) errors.fullName = "Keep your name under 120 characters.";
    if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
    if (password.length < 6) errors.password = "Use at least 6 characters.";
    if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";
    setAccountErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createAccount = async () => {
    const credentials: SignupCredentials = { email: email.trim(), password, fullName: fullName.trim() };

    let application;
    if (type === "organizer") {
      const result = organizerForm.validate();
      if (!result.ok) {
        setError("Please fix the highlighted fields.");
        return;
      }
      application = result.data;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Organizers confirm their email and land on their application status.
      const landing = type === "organizer" ? "/manager/application" : (next ?? "/");
      const result = await signUpWithEmail(
        credentials,
        landing,
        application
          ? {
              organization_name: application.organizationName,
              phone: application.phone,
              city: application.city,
              website: application.website,
              event_types: application.eventTypes,
              description: application.description,
            }
          : undefined
      );

      if (!result.ok) {
        setError(result.errorMessage ?? "Signup failed. Please try again.");
        return;
      }

      if (result.requiresEmailVerification) {
        setSuccessMessage(
          type === "organizer"
            ? `We've sent a confirmation link to ${credentials.email}. Your organizer application is in our review queue; confirm your email to follow its status${organizerForm.logoFile ? " and add your logo" : ""}.`
            : `We've sent a confirmation link to ${credentials.email}. Open it to finish creating your account.`
        );
        return;
      }

      // Signed in straight away (email confirmation off): add the logo now.
      if (application && organizerForm.logoFile) {
        const upload = await uploadOrganizerLogo(organizerForm.logoFile);
        if (upload.ok) await applyAsOrganizer(application, upload.path);
      }
      router.push(landing);
      router.refresh();
    } catch {
      setError("Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async () => {
    if (isSubmitting) return;
    if (step === "account") {
      if (!validateAccount()) return;
      if (type === "organizer") {
        setError(null);
        setStep("organization");
        return;
      }
      await createAccount();
      return;
    }
    if (step === "organization") await createAccount();
  };

  return {
    type,
    step,
    fullName,
    email,
    password,
    confirmPassword,
    accountErrors,
    organizerForm,
    isSubmitting,
    error,
    successMessage,
    loginHref,
    onChooseType,
    onBack,
    onFullNameChange: (value) => {
      setFullName(value);
      clearError("fullName");
    },
    onEmailChange: (value) => {
      setEmail(value);
      clearError("email");
    },
    onPasswordChange: (value) => {
      setPassword(value);
      clearError("password");
    },
    onConfirmPasswordChange: (value) => {
      setConfirmPassword(value);
      clearError("confirmPassword");
    },
    onSubmit,
  };
}
