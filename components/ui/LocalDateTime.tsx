"use client";

import { useSyncExternalStore } from "react";

type Format = "date" | "dateTime" | "time" | "weekdayDate" | "dayMonth";

const OPTIONS: Record<Format, Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "short", year: "numeric" },
  dateTime: { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
  weekdayDate: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  dayMonth: { day: "numeric", month: "short" },
};

const subscribe = () => () => {};

// Server-rendered pages don't know the visitor's time zone. This renders a
// UTC value on the server and swaps to the visitor's local time after
// hydration, so every date on the site is shown in local time.
export function LocalDateTime({ iso, format = "dateTime", className }: { iso: string; format?: Format; className?: string }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const options = isClient ? OPTIONS[format] : { ...OPTIONS[format], timeZone: "UTC" };
  const text = new Intl.DateTimeFormat("en-GB", options).format(new Date(iso));

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
