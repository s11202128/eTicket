"use client";

import { useState } from "react";
import { redeemTicket } from "@/features/tickets/model/tickets.repository";

type CheckInViewModel = {
  code: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onCodeChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

// Accepts the bare code or the full QR payload ("ETICKET-<code>").
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/^ETICKET-/, "");
}

export function useCheckInViewModel(): CheckInViewModel {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    const normalized = normalizeCode(code);
    if (!normalized || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await redeemTicket(normalized);
      if (!result.ok) {
        setError(result.errorMessage ?? "Check-in failed.");
        return;
      }

      const holder = result.holderEmail ? ` for ${result.holderEmail}` : "";
      setSuccessMessage(`Checked in${holder} — ${result.eventTitle ?? "event"}.`);
      setCode("");
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
