"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import { cancelAdminEvent } from "@/features/admin/model/adminEvents.repository";
import {
  declineCancellation,
  listCancellationRequests,
  type CancellationRequest,
} from "@/features/admin/model/reviews.repository";

export type CancellationAction = { kind: "cancel" | "decline"; request: CancellationRequest };

export function useCancellationRequests() {
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading, reload } = useAsyncData(listCancellationRequests, "cancellations");
  const [action, setAction] = useState<CancellationAction | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const start = (kind: CancellationAction["kind"], request: CancellationRequest) => {
    setAction({ kind, request });
    // Start empty: the organizer's reason may not be meant for ticket holders.
    setNote("");
    setNoteError(null);
  };

  const confirm = async () => {
    if (!action || isWorking) return;
    if (action.kind === "decline" && note.trim().length < 5) {
      setNoteError("Tell the organizer why (at least 5 characters).");
      return;
    }
    setIsWorking(true);
    try {
      if (action.kind === "cancel") {
        const result = await cancelAdminEvent(action.request.id, note);
        if (!result.ok) {
          toast.show(result.errorMessage, "error");
          return;
        }
        toast.show(`Event cancelled. ${result.data} ticket${result.data === 1 ? "" : "s"} cancelled and holders notified.`, "success");
      } else {
        const result = await declineCancellation(action.request.id, note);
        if (!result.ok) {
          toast.show(result.errorMessage, "error");
          return;
        }
        toast.show("Request declined. The organizer was notified.", "success");
      }
      setAction(null);
      await reload();
      router.refresh();
    } finally {
      setIsWorking(false);
    }
  };

  return {
    requests: data ?? [],
    error,
    isLoading: isLoading || !data,
    reload,
    action,
    start,
    close: () => setAction(null),
    note,
    setNote: (value: string) => {
      setNote(value);
      setNoteError(null);
    },
    noteError,
    isWorking,
    confirm,
  };
}
