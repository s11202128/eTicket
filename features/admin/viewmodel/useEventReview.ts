"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import { getEventForReview, reviewEvent, type EventDecision } from "@/features/admin/model/reviews.repository";

const SUCCESS: Record<EventDecision, string> = {
  approve: "Approved and published.",
  request_changes: "Changes requested. The organizer was notified.",
  reject: "Event rejected. The organizer was notified.",
};

export function useEventReview(eventId: string) {
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading, reload } = useAsyncData(() => getEventForReview(eventId), eventId);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<EventDecision | null>(null);

  const decide = async (decision: EventDecision) => {
    if (busy) return;
    if (decision !== "approve" && note.trim().length < 5) {
      setNoteError(
        decision === "reject"
          ? "Give the reason for rejecting (at least 5 characters)."
          : "Tell the organizer what to change (at least 5 characters)."
      );
      return;
    }
    setBusy(decision);
    try {
      const result = await reviewEvent(eventId, decision, note);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(SUCCESS[decision], "success");
      router.push("/admin/reviews");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return {
    event: data,
    error,
    isLoading,
    reload,
    note,
    setNote: (value: string) => {
      setNote(value);
      setNoteError(null);
    },
    noteError,
    busy,
    decide,
  };
}
