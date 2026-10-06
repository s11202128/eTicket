"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hasActiveSession } from "@/features/auth/model/session.repository";
import { createEvent } from "@/features/events/model/events.repository";
import type { CreateEventInput } from "@/features/events/model/events.types";

type CreateEventViewModel = {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  price: string;
  imageUrl: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function useCreateEventViewModel(): CreateEventViewModel {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hasActiveSession().then((isAuthenticated) => {
      if (!isAuthenticated) {
        router.replace("/login");
      }
    });
  }, [router]);

  const isFormValid = useMemo(() => {
    return (
      title.trim().length > 0 &&
      location.trim().length > 0 &&
      startsAt.length > 0 &&
      price.trim().length > 0
    );
  }, [title, location, startsAt, price]);

  const onSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Price must be 0 or more.");
      return;
    }

    // datetime-local values have no timezone, so they are read as local time.
    const startDate = new Date(startsAt);
    if (Number.isNaN(startDate.getTime())) {
      setError("Please choose a valid date and time.");
      return;
    }

    const trimmedImageUrl = imageUrl.trim();
    if (trimmedImageUrl && !isHttpUrl(trimmedImageUrl)) {
      setError("Image URL must start with http:// or https://.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateEventInput = {
        title: title.trim(),
        description: description.trim() || null,
        startsAt: startDate.toISOString(),
        location: location.trim(),
        price: parsedPrice,
        imageUrl: trimmedImageUrl || null,
      };

      const result = await createEvent(input);

      if (!result.ok) {
        setError(result.errorMessage ?? "Could not save the event. Please try again.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Could not save the event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title,
    description,
    startsAt,
    location,
    price,
    imageUrl,
    isSubmitting,
    error,
    isFormValid,
    onTitleChange: setTitle,
    onDescriptionChange: setDescription,
    onStartsAtChange: setStartsAt,
    onLocationChange: setLocation,
    onPriceChange: setPrice,
    onImageUrlChange: setImageUrl,
    onSubmit,
  };
}
