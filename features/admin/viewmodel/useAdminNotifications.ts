"use client";

import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import { listEventOptions } from "@/features/admin/model/adminEvents.repository";
import {
  listRecentBroadcasts,
  sendBroadcast,
  sendToEventHolders,
  type NotificationDraft,
} from "@/features/admin/model/adminNotifications.repository";

export type Audience = "everyone" | "event";

const draftSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Keep the title under 120 characters."),
  body: z.string().trim().max(1000, "Keep the message under 1000 characters."),
  // Internal links only (matches the database check), e.g. /events/summer-fest
  link: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\/[^/]/.test(value), {
      message: "Use a link on this site that starts with /, e.g. /events/summer-fest",
    }),
});

type Errors = Partial<Record<keyof NotificationDraft | "eventId", string>>;

export function useAdminNotifications() {
  const toast = useToast();
  const events = useAsyncData(listEventOptions, "event-options");
  const recent = useAsyncData(listRecentBroadcasts, "recent-broadcasts");

  const [audience, setAudience] = useState<Audience>("everyone");
  const [eventId, setEventId] = useState("");
  const [draft, setDraft] = useState<NotificationDraft>({ title: "", body: "", link: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const setField = (key: keyof NotificationDraft, value: string) => {
    setErrors((current) => ({ ...current, [key]: undefined }));
    setDraft((current) => ({ ...current, [key]: value }));
  };

  // Validate first, then ask for confirmation.
  const requestSend = () => {
    const parsed = draftSchema.safeParse(draft);
    const next: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof NotificationDraft;
        if (!next[key]) next[key] = issue.message;
      }
    }
    if (audience === "event" && !eventId) next.eventId = "Choose an event.";
    setErrors(next);
    if (Object.keys(next).length === 0) setConfirmOpen(true);
  };

  const send = async () => {
    setIsSending(true);
    if (audience === "everyone") {
      const result = await sendBroadcast(draft);
      setIsSending(false);
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      toast.success("Sent to all users.");
      await recent.reload();
    } else {
      const result = await sendToEventHolders(eventId, draft);
      setIsSending(false);
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      toast.success(
        result.data === 0
          ? "Nobody holds a ticket for this event yet, so nothing was sent."
          : `Sent to ${result.data} ticket holder${result.data === 1 ? "" : "s"}.`
      );
    }
    setConfirmOpen(false);
    setDraft({ title: "", body: "", link: "" });
  };

  const selectedEvent = events.data?.find((event) => event.id === eventId);

  return {
    audience,
    setAudience,
    eventId,
    setEventId: (value: string) => {
      setErrors((current) => ({ ...current, eventId: undefined }));
      setEventId(value);
    },
    eventOptions: events.data ?? [],
    selectedEvent,
    draft,
    setField,
    errors,
    requestSend,
    confirmOpen,
    closeConfirm: () => setConfirmOpen(false),
    send,
    isSending,
    recent,
  };
}
