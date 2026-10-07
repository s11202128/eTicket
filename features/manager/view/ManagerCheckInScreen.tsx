"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatShortDateTime } from "@/lib/format";
import { ErrorState } from "@/features/admin/view/AdminUi";
import { SCANNER_ELEMENT_ID } from "@/features/admin/viewmodel/useCheckInScanner";
import { CheckInResultPanel } from "@/features/tickets/view/CheckInResultPanel";
import { useManagerCheckIn } from "@/features/manager/viewmodel/useManagerCheckIn";

export default function ManagerCheckInScreen({ initialEventId }: { initialEventId: string | null }) {
  const vm = useManagerCheckIn(initialEventId);
  const { scanner } = vm;
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraOn = scanner.cameraState === "on" || scanner.cameraState === "starting";

  const enterFullScreen = () => {
    void containerRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  if (vm.eventsError) return <ErrorState message={vm.eventsError} />;
  if (vm.eventsLoading) return <SkeletonRows rows={4} label="Loading your events" />;
  if (vm.events.length === 0) {
    return (
      <EmptyState
        icon="✔"
        title="No events to check in"
        description="Live events you organize, or are door staff for, appear here from two days before they start."
      />
    );
  }

  return (
    <div ref={containerRef} className="mx-auto grid w-full max-w-xl gap-4 bg-bg [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Check-in</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={vm.toggleSound} aria-pressed={vm.soundOn}>
            {vm.soundOn ? "🔊 Sound on" : "🔇 Sound off"}
          </Button>
          <Button variant="secondary" size="sm" onClick={enterFullScreen}>
            Full screen
          </Button>
        </div>
      </div>

      <Field label="Event">
        {(props) => (
          <Select {...props} className="h-12 text-base" value={vm.eventId ?? ""} onChange={(event) => vm.chooseEvent(event.target.value)}>
            {vm.eventId ? null : <option value="">Choose the event you&apos;re checking in for</option>}
            {vm.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {formatShortDateTime(event.startsAt)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {vm.eventId ? (
        <>
          <div
            aria-live="polite"
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm font-semibold text-muted">Checked in</span>
            <span className="text-3xl font-extrabold tabular-nums">
              {vm.progress ? (
                <>
                  {vm.progress.checkedIn}
                  <span className="text-lg text-muted"> / {vm.progress.total}</span>
                </>
              ) : (
                "…"
              )}
            </span>
          </div>

          {scanner.display ? <CheckInResultPanel display={scanner.display} onDismiss={scanner.clearDisplay} /> : null}
          {scanner.error ? (
            <p role="alert" className="rounded-md border border-danger/40 bg-danger-bg p-3 text-sm font-semibold text-danger">
              {scanner.error}
            </p>
          ) : null}

          <section aria-label="Camera scanner" className="grid gap-3 rounded-lg border border-border bg-surface p-3">
            <div id={SCANNER_ELEMENT_ID} className={cn("overflow-hidden rounded-md bg-black", cameraOn ? "min-h-72" : "hidden")} />
            {scanner.cameraError ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {scanner.cameraError}
              </p>
            ) : null}
            {cameraOn ? (
              <Button variant="secondary" size="lg" onClick={() => void scanner.stopCamera()}>
                Stop camera
              </Button>
            ) : (
              <Button size="lg" className="h-16 text-lg" onClick={() => void scanner.startCamera()} isLoading={scanner.cameraState === "starting"}>
                📷 Start scanning
              </Button>
            )}
          </section>

          <form
            className="grid gap-3 rounded-lg border border-border bg-surface p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void scanner.submitManual();
            }}
          >
            <Field label="Or type the ticket code" hint="Works with or without the ETICKET- prefix.">
              {(props) => (
                <Input
                  {...props}
                  value={scanner.code}
                  onChange={(event) => scanner.setCode(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-14 font-mono text-xl tracking-widest uppercase"
                  placeholder="ABC123DEF456"
                />
              )}
            </Field>
            <Button type="submit" size="lg" isLoading={scanner.isChecking} disabled={!scanner.code.trim()}>
              Check in
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
