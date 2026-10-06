"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { checkInTicket } from "@/features/tickets/model/tickets.repository";
import type { CheckInResult } from "@/lib/database.types";

export const SCANNER_ELEMENT_ID = "checkin-scanner";

export type CheckInDisplay = {
  result: CheckInResult;
  code: string;
  holderName: string | null;
  eventTitle: string | null;
  checkedInAt: string | null;
};

type CameraState = "off" | "starting" | "on" | "error";

// The same code is ignored for a few seconds so a QR held in front of the
// camera isn't submitted over and over.
const REPEAT_SCAN_MS = 4000;

export function useCheckInScanner() {
  const [code, setCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [display, setDisplay] = useState<CheckInDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const busyRef = useRef(false);

  const submit = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed || busyRef.current) return;

    busyRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      const outcome = await checkInTicket(trimmed);
      if (!outcome.ok || !outcome.result) {
        setDisplay(null);
        setError(outcome.errorMessage ?? "Check-in failed.");
        return;
      }
      setDisplay({
        result: outcome.result,
        code: outcome.code ?? trimmed,
        holderName: outcome.holderName ?? null,
        eventTitle: outcome.eventTitle ?? null,
        checkedInAt: outcome.checkedInAt ?? null,
      });
      setCode("");
      // Short buzz for valid, long for a problem (supported on most phones).
      navigator.vibrate?.(outcome.result === "valid" ? 120 : [80, 60, 220]);
    } catch {
      setError("Check-in failed. Check your connection and try again.");
    } finally {
      busyRef.current = false;
      setIsChecking(false);
    }
  }, []);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // Already stopped.
      }
    }
    setCameraState("off");
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraState("starting");
    try {
      // Loaded only when the camera is used, to keep the page light.
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const now = Date.now();
          if (decoded === lastScan.current.code && now - lastScan.current.at < REPEAT_SCAN_MS) return;
          lastScan.current = { code: decoded, at: now };
          void submit(decoded);
        },
        () => {
          // No QR in this frame; keep scanning.
        }
      );
      setCameraState("on");
    } catch (caught) {
      scannerRef.current = null;
      setCameraState("error");
      const message = caught instanceof Error ? caught.message : String(caught);
      setCameraError(
        /permission|denied|notallowed/i.test(message)
          ? "Camera access was blocked. Allow camera access in your browser settings, or type the code below."
          : "Couldn't start the camera. Type the code below instead."
      );
    }
  }, [submit]);

  // Release the camera when leaving the page.
  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  return {
    code,
    setCode,
    isChecking,
    display,
    clearDisplay: () => setDisplay(null),
    error,
    cameraState,
    cameraError,
    startCamera,
    stopCamera,
    submitManual: () => submit(code),
  };
}
