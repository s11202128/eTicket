"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { useCheckInScanner, type CheckInDisplay } from "@/features/admin/viewmodel/useCheckInScanner";
import {
  getCheckInProgress,
  listCheckInEvents,
  type CheckInProgress,
} from "@/features/manager/model/manager.repository";

const PROGRESS_REFRESH_MS = 20_000;

// Short beep: high for valid, low double buzz for a problem.
function playTone(valid: boolean) {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const beep = (start: number, frequency: number, duration: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = valid ? "sine" : "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, context.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration);
    };
    if (valid) beep(0, 880, 0.18);
    else {
      beep(0, 220, 0.18);
      beep(0.24, 220, 0.24);
    }
    window.setTimeout(() => void context.close(), 800);
  } catch {
    // Sound is a nice-to-have.
  }
}

export function useManagerCheckIn(initialEventId: string | null) {
  const events = useAsyncData(listCheckInEvents, "check-in-events");
  const [chosenId, setChosenId] = useState<string | null>(initialEventId);
  const [progress, setProgress] = useState<CheckInProgress | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  });

  // With a single event there's nothing to choose.
  const list = events.data ?? [];
  const eventId = chosenId && list.some((event) => event.id === chosenId) ? chosenId : list.length === 1 ? list[0].id : null;
  const event = list.find((item) => item.id === eventId) ?? null;

  const refreshProgress = useCallback(async () => {
    if (!eventId) return;
    try {
      setProgress(await getCheckInProgress(eventId));
    } catch {
      // Keep the last known numbers.
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    const load = () =>
      getCheckInProgress(eventId)
        .then((value) => {
          if (!cancelled) setProgress(value);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, PROGRESS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [eventId]);

  const onResult = useCallback(
    (display: CheckInDisplay) => {
      if (soundRef.current) playTone(display.result === "valid");
      if (display.result === "valid") void refreshProgress();
    },
    [refreshProgress]
  );

  const scanner = useCheckInScanner({ eventId, onResult });

  const chooseEvent = (id: string) => {
    void scanner.stopCamera();
    scanner.clearDisplay();
    setProgress(null);
    setChosenId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("event", id);
    window.history.replaceState(null, "", url);
  };

  return {
    events: list,
    eventsLoading: events.isLoading,
    eventsError: events.error,
    eventId,
    event,
    chooseEvent,
    progress: progress && eventId ? progress : null,
    soundOn,
    toggleSound: () => setSoundOn((value) => !value),
    scanner,
  };
}
