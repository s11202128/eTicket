"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserId } from "@/features/auth/model/session.repository";
import {
  createEvent,
  getEventDetails,
  updateEvent,
} from "@/features/events/model/events.repository";
import type { EventInput } from "@/features/events/model/events.types";
import { isHttpUrl, toDateTimeLocalValue } from "@/lib/format";

type EventFormViewModel = {
  mode: "create" | "edit";
  isLoading: boolean;
  loadError: string | null;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  price: string;
  capacity: string;
  imageUrl: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  cancelHref: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onCapacityChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

// Pass an eventId to edit that event; omit it to create a new one.
export function useEventFormViewModel(eventId?: string): EventFormViewModel {
  const router = useRouter();
  const mode = eventId ? "edit" : "create";
  const [isLoading, setIsLoading] = useState(Boolean(eventId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booked, setBooked] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    const load = async () => {
      try {
        const [event, userId] = await Promise.all([getEventDetails(eventId), getCurrentUserId()]);
        if (!isMounted) return;

        if (!event) {
          setLoadError("Event not found.");
        } else if (event.createdBy !== userId) {
          setLoadError("You can only edit events you created.");
        } else {
          setTitle(event.title);
          setDescription(event.description ?? "");
          setStartsAt(toDateTimeLocalValue(event.startsAtIso));
          setLocation(event.location);
          setPrice(String(event.priceValue));
          setCapacity(event.capacity === null ? "" : String(event.capacity));
          setImageUrl(event.imageUrlRaw ?? "");
          setBooked(event.booked);
        }
      } catch {
        if (isMounted) setLoadError("Unable to load this event.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

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

    const trimmedCapacity = capacity.trim();
    const parsedCapacity = trimmedCapacity ? Number(trimmedCapacity) : null;
    if (parsedCapacity !== null && (!Number.isInteger(parsedCapacity) || parsedCapacity < 1)) {
      setError("Capacity must be a whole number of at least 1, or empty for unlimited.");
      return;
    }

    if (parsedCapacity !== null && parsedCapacity < booked) {
      setError(`Capacity can't be lower than the ${booked} tickets already booked.`);
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
      const input: EventInput = {
        title: title.trim(),
        description: description.trim() || null,
        startsAt: startDate.toISOString(),
        location: location.trim(),
        price: parsedPrice,
        capacity: parsedCapacity,
        imageUrl: trimmedImageUrl || null,
      };

      if (eventId) {
        const result = await updateEvent(eventId, input);
        if (!result.ok) {
          setError(result.errorMessage ?? "Could not save the event. Please try again.");
          return;
        }
        router.push(`/events/${eventId}`);
        return;
      }

      const result = await createEvent(input);
      if (!result.ok) {
        setError(result.errorMessage ?? "Could not save the event. Please try again.");
        return;
      }

      router.push(result.eventId ? `/events/${result.eventId}` : "/events");
    } catch {
      setError("Could not save the event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    mode,
    isLoading,
    loadError,
    title,
    description,
    startsAt,
    location,
    price,
    capacity,
    imageUrl,
    isSubmitting,
    error,
    isFormValid,
    cancelHref: eventId ? `/events/${eventId}` : "/events",
    onTitleChange: setTitle,
    onDescriptionChange: setDescription,
    onStartsAtChange: setStartsAt,
    onLocationChange: setLocation,
    onPriceChange: setPrice,
    onCapacityChange: setCapacity,
    onImageUrlChange: setImageUrl,
    onSubmit,
  };
}
