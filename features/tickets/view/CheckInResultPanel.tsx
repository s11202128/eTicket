"use client";

import type { CheckInResult } from "@/lib/database.types";
import { formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CheckInDisplay } from "@/features/admin/viewmodel/useCheckInScanner";

// Big green / red answer shown after each scan (admin and Event Manager check-in).
export const RESULT_COPY: Record<CheckInResult, { label: string; detail: string }> = {
  valid: { label: "VALID", detail: "Checked in. Let them in." },
  already_used: { label: "ALREADY USED", detail: "This ticket was already checked in." },
  cancelled: { label: "CANCELLED", detail: "This ticket or event was cancelled." },
  wrong_date: { label: "WRONG DATE", detail: "This ticket isn't valid for today's entry window." },
  wrong_event: { label: "WRONG EVENT", detail: "This ticket is for a different event than the one selected." },
  not_found: { label: "INVALID", detail: "No ticket matches this code. Check the code and try again." },
};

// Mirrors check_in_ticket: entry opens 6 hours before the start.
const ENTRY_OPENS_BEFORE_MS = 6 * 60 * 60 * 1000;

// Says when entry opens (too early) or that the event is over (too late).
function wrongDateDetail(startsAt: string | null): string {
  if (!startsAt) return RESULT_COPY.wrong_date.detail;
  const opensAt = new Date(startsAt).getTime() - ENTRY_OPENS_BEFORE_MS;
  if (Date.now() < opensAt) {
    return `Too early: entry opens ${formatShortDateTime(new Date(opensAt).toISOString())} (6 hours before the start). The ticket itself is fine.`;
  }
  return "This event has ended, so its tickets can't be checked in any more.";
}

export function CheckInResultPanel({ display, onDismiss }: { display: CheckInDisplay; onDismiss: () => void }) {
  const copy = RESULT_COPY[display.result];
  const detail = display.result === "wrong_date" ? wrongDateDetail(display.startsAt) : copy.detail;
  const isValid = display.result === "valid";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "grid gap-2 rounded-xl p-6 text-center text-white shadow-lg sm:p-8",
        // Dark green / dark red keep white text above 4.5:1 contrast.
        isValid ? "bg-[#166534]" : "bg-[#991b1b]"
      )}
    >
      <p aria-hidden className="text-5xl">
        {isValid ? "✓" : "✕"}
      </p>
      <p className="text-4xl font-extrabold tracking-wide sm:text-5xl">{copy.label}</p>
      {display.holderName ? <p className="text-2xl font-bold">{display.holderName}</p> : null}
      {display.ticketTypeName && display.result === "valid" ? (
        <p className="text-xl font-semibold">{display.ticketTypeName}</p>
      ) : null}
      {display.eventTitle ? <p className="text-lg opacity-90">{display.eventTitle}</p> : null}
      <p className="text-base opacity-90">{detail}</p>
      {display.result === "already_used" && display.checkedInAt ? (
        <p className="text-base font-semibold">Checked in at {formatShortDateTime(display.checkedInAt)}</p>
      ) : null}
      <p className="font-mono text-sm tracking-widest opacity-80">{display.code}</p>
      <div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 rounded-md bg-white/15 px-5 py-2 text-base font-semibold hover:bg-white/25"
        >
          Scan next
        </button>
      </div>
    </div>
  );
}
