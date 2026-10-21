"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  listContactMessages,
  setMessageHandled,
  type ContactMessageRow,
  type MessageFilter,
} from "@/features/admin/model/messages.repository";

export const MESSAGES_PAGE_SIZE = 20;

export function useContactMessages() {
  const toast = useToast();
  const [filter, setFilter] = useState<MessageFilter>("open");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useAsyncData(
    () => listContactMessages(filter, page, MESSAGES_PAGE_SIZE),
    `${filter}|${page}`
  );
  // Message being updated (its button shows a spinner).
  const [workingId, setWorkingId] = useState<string | null>(null);

  const toggleHandled = async (message: ContactMessageRow) => {
    if (workingId) return;
    const handled = !message.handledAt;
    setWorkingId(message.id);
    try {
      const result = await setMessageHandled(message.id, handled);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(handled ? "Marked as handled." : "Moved back to open.", "success");
      await reload();
    } finally {
      setWorkingId(null);
    }
  };

  return {
    filter,
    setFilter: (value: MessageFilter) => {
      setFilter(value);
      setPage(1);
    },
    page,
    setPage,
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    error,
    isLoading: isLoading || !data,
    reload,
    workingId,
    toggleHandled,
  };
}
