"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/features/admin/view/AdminUi";
import { SCANNER_ELEMENT_ID, useCheckInScanner } from "@/features/admin/viewmodel/useCheckInScanner";
import { CheckInResultPanel } from "@/features/tickets/view/CheckInResultPanel";

export default function CheckInScannerScreen() {
  const vm = useCheckInScanner();
  const cameraOn = vm.cameraState === "on" || vm.cameraState === "starting";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <PageHeader title="Check-in" description="Scan a ticket QR code or type the 12-character code." />

      {vm.display ? <CheckInResultPanel display={vm.display} onDismiss={vm.clearDisplay} /> : null}
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
