"use client";

import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "@/features/profile/model/profile.repository";
import { isHttpUrl } from "@/lib/format";

type ProfileViewModel = {
  isLoading: boolean;
  loadError: string | null;
  email: string;
  fullName: string;
  avatarUrl: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onFullNameChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useProfileViewModel(): ProfileViewModel {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyProfile()
      .then((profile) => {
        if (!isMounted) return;
        if (!profile) {
          setLoadError("Profile not found.");
          return;
        }
        setUserId(profile.id);
        setEmail(profile.email ?? "");
        setFullName(profile.full_name ?? "");
        setAvatarUrl(profile.avatar_url ?? "");
      })
      .catch(() => {
        if (isMounted) setLoadError("Unable to load your profile.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async () => {
    if (!userId || isSubmitting) return;

    const trimmedAvatarUrl = avatarUrl.trim();
    if (trimmedAvatarUrl && !isHttpUrl(trimmedAvatarUrl)) {
      setError("Avatar URL must start with http:// or https://.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateMyProfile(userId, {
        fullName: fullName.trim() || null,
        avatarUrl: trimmedAvatarUrl || null,
      });

      if (!result.ok) {
        setError(result.errorMessage ?? "Could not save your profile.");
        return;
      }

      setSuccessMessage("Profile saved.");
    } catch {
      setError("Could not save your profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isLoading,
    loadError,
    email,
    fullName,
    avatarUrl,
    isSubmitting,
    error,
    successMessage,
    onFullNameChange: setFullName,
    onAvatarUrlChange: setAvatarUrl,
    onSubmit,
  };
}
