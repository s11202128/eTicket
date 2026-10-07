"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { publicImageUrl, uploadImage, validateImage } from "@/lib/storage";
import { getMyProfile, updateMyProfile } from "@/features/profile/model/profile.repository";

export function useProfileViewModel() {
  const router = useRouter();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((profile) => {
        if (!active) return;
        if (!profile) {
          setLoadError("Profile not found.");
          return;
        }
        setUserId(profile.id);
        setEmail(profile.email ?? "");
        setFullName(profile.full_name ?? "");
        setAvatarUrl(profile.avatar_url);
      })
      .catch(() => {
        if (active) setLoadError("Couldn't load your profile.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Files go under avatars/<user id>/, the only folder the user may write.
  const onAvatarSelected = async (file: File | undefined) => {
    if (!file || !userId) return;
    const problem = validateImage(file, "avatars");
    if (problem) {
      setAvatarError(problem);
      return;
    }
    setAvatarError(null);
    setIsUploading(true);
    const result = await uploadImage("avatars", file, userId);
    setIsUploading(false);
    if (!result.ok) {
      setAvatarError(result.errorMessage);
      return;
    }
    setAvatarUrl(publicImageUrl("avatars", result.path));
  };

  const onSave = async () => {
    if (!userId) return;
    if (fullName.trim().length > 80) {
      setNameError("Keep your name under 80 characters.");
      return;
    }
    setNameError(null);
    setIsSaving(true);
    const result = await updateMyProfile(userId, { fullName: fullName.trim() || null, avatarUrl });
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.errorMessage ?? "Couldn't save your profile.");
      return;
    }
    toast.success("Profile saved.");
    // Refresh server-rendered parts such as the header avatar.
    router.refresh();
  };

  return {
    isLoading,
    loadError,
    email,
    fullName,
    setFullName,
    avatarUrl,
    removeAvatar: () => setAvatarUrl(null),
    onAvatarSelected,
    isUploading,
    avatarError,
    nameError,
    isSaving,
    onSave,
  };
}
