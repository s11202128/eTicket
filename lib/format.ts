import { siteConfig } from "@/lib/siteConfig";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// Currency comes from lib/siteConfig.ts so prices and the footer note agree.
// Amounts get the configured symbol (e.g. "SI$1,250" or "SI$12.50").
const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatPrice(price: number): string {
  if (price === 0) return "Free";
  // Show cents as 2 digits when present: SI$12.50, not SI$12.5.
  const amount = Number.isInteger(price)
    ? amountFormatter.format(price)
    : amountFormatter.format(price).replace(/\.(\d)$/, ".$10");
  return `${siteConfig.currency.symbol}${amount}`;
}

// Converts an ISO timestamp to the local-time value a datetime-local input expects.
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function formatShortDateTime(iso: string): string {
  return shortDateTimeFormatter.format(new Date(iso));
}

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

// Viewer's IANA time zone, e.g. "Pacific/Port_Moresby".
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
