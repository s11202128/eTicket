"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { OrganizerStatus } from "@/lib/database.types";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  listOrganizerApplications,
  reviewOrganizer,
  type OrganizerApplicationRow,
  type OrganizerDecision,
} from "@/features/admin/model/reviews.repository";

export type OrganizerStatusFilter = OrganizerStatus | "all";

const SUCCESS: Record<OrganizerDecision, string> = {
  approve: "Organizer approved. They can create events now.",
  reject: "Application rejected. The applicant was notified.",
  suspend: "Organizer suspended.",
};

export function useOrganizerQueue() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<OrganizerStatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const key = `${status}|${search}|${page}`;
  const { data, error, isLoading, reload } = useAsyncData(() => listOrganizerApplications(status, search, page), key);

  const [selected, setSelected] = useState<OrganizerApplicationRow | null>(null);
  const [decision, setDecision] = useState<OrganizerDecision | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  const startDecision = (value: OrganizerDecision) => {
    setDecision(value);
    setNote("");
    setNoteError(null);
  };

  const confirmDecision = async () => {
    if (!selected || !decision || isDeciding) return;
    if (decision !== "approve" && note.trim().length < 5) {
      setNoteError("Give a reason (at least 5 characters). The organizer will see it.");
      return;
    }
    setIsDeciding(true);
    try {
      const result = await reviewOrganizer(selected.userId, decision, note);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(SUCCESS[decision], "success");
      setDecision(null);
      setSelected(null);
      await reload();
      // Sidebar badge counts.
      router.refresh();
    } finally {
      setIsDeciding(false);
    }
  };

  return {
    status,
    setStatus: (value: OrganizerStatusFilter) => {
      setStatus(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    page,
    setPage,
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    reload,
    selected,
    open: setSelected,
    close: () => setSelected(null),
    decision,
    startDecision,
    cancelDecision: () => setDecision(null),
    note,
    setNote: (value: string) => {
      setNote(value);
      setNoteError(null);
    },
    noteError,
    isDeciding,
    confirmDecision,
  };
}
