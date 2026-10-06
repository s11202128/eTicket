"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { CheckInResult } from "@/lib/database.types";
import { formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/features/admin/view/AdminUi";
import {
  SCANNER_ELEMENT_ID,
  useCheckInScanner,
  type CheckInDisplay,
} from "@/features/admin/viewmodel/useCheckInScanner";

const RESULT_COPY: Record<CheckInResult, { label: string; detail: string }> = {
  valid: { label: "VALID", detail: "Checked in. Let them in." },
  already_used: { label: "ALREADY USED", detail: "This ticket was already checked in." },
  cancelled: { label: "CANCELLED", detail: "This ticket or event was cancelled." },
  wrong_date: { label: "WRONG DATE", detail: "This ticket isn't valid for today's entry window." },
  not_found: { label: "INVALID", detail: "No ticket with this code." },
};

function ResultPanel({ display, onDismiss }: { display: CheckInDisplay; onDismiss: () => void }) {
  const copy = RESULT_COPY[display.result];
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
      {display.eventTitle ? <p className="text-lg opacity-90">{display.eventTitle}</p> : null}
      <p className="text-base opacity-90">{copy.detail}</p>
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

export default function CheckInScannerScreen() {
  const vm = useCheckInScanner();
  const cameraOn = vm.cameraState === "on" || vm.cameraState === "starting";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <PageHeader title="Check-in" description="Scan a ticket QR code or type the 12-character code." />

      {vm.display ? <ResultPanel display={vm.display} onDismiss={vm.clearDisplay} /> : null}
      {vm.error ? (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger-bg p-3 text-sm font-semibold text-danger">
          {vm.error}
        </p>
      ) : null}

      <section aria-label="Camera scanner" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <div
          id={SCANNER_ELEMENT_ID}
          className={cn("overflow-hidden rounded-md bg-black", cameraOn ? "min-h-64" : "hidden")}
        />
        {vm.cameraError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {vm.cameraError}
          </p>
        ) : null}
        {cameraOn ? (
          <Button variant="secondary" size="lg" onClick={() => void vm.stopCamera()}>
            Stop camera
          </Button>
        ) : (
          <Button size="lg" onClick={() => void vm.startCamera()} isLoading={vm.cameraState === "starting"}>
            Start camera scanner
          </Button>
        )}
      </section>

      <form
        className="grid gap-3 rounded-lg border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void vm.submitManual();
        }}
      >
        <Field label="Ticket code" hint="Works with or without the ETICKET- prefix.">
          {(props) => (
            <Input
              {...props}
              value={vm.code}
              onChange={(event) => vm.setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-14 font-mono text-xl tracking-widest uppercase"
              placeholder="ABC123DEF456"
            />
          )}
        </Field>
        <Button type="submit" size="lg" isLoading={vm.isChecking} disabled={!vm.code.trim()}>
          Check in
        </Button>
      </form>
    </div>
  );
}
