"use client";

import { useState } from "react";
import { checkInTicket } from "@/features/tickets/model/tickets.repository";
import type { CheckInResult } from "@/lib/database.types";

const RESULT_MESSAGES: Record<CheckInResult, string> = {
  valid: "Valid ticket. Checked in",
  already_used: "Already used",
  cancelled: "Ticket cancelled",
  wrong_date: "Not valid today",
  not_found: "Ticket not found",
};

type CheckInViewModel = {
  code: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onCodeChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function useCheckInViewModel(): CheckInViewModel {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    // The database accepts the bare code or the QR payload "ETICKET-<code>".
    const trimmed = code.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const outcome = await checkInTicket(trimmed);
      if (!outcome.ok || !outcome.result) {
        setError(outcome.errorMessage ?? "Check-in failed.");
        return;
      }

      const details = [outcome.holderName, outcome.eventTitle].filter(Boolean).join(" · ");
      const message = details
        ? `${RESULT_MESSAGES[outcome.result]}: ${details}`
        : RESULT_MESSAGES[outcome.result];

      if (outcome.result === "valid") {
        setSuccessMessage(message);
        setCode("");
      } else {
        setError(message);
      }
    } catch {
      setError("Check-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    code,
    isSubmitting,
    error,
    successMessage,
    onCodeChange: setCode,
    onSubmit,
  };
}
