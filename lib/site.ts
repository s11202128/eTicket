// Site-wide settings used for SEO, Open Graph images and the sitemap.

export const SITE_NAME = "E-Ticket";

// Public base URL, e.g. https://tickets.example.com (set NEXT_PUBLIC_SITE_URL).
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

// Time zone for dates rendered on the server where the visitor's zone is
// unknown (social preview images, search snippets). Set SITE_TIME_ZONE to
// your events' local zone, e.g. "Pacific/Port_Moresby".
export function siteTimeZone(): string {
  const zone = process.env.SITE_TIME_ZONE || "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

export function formatInSiteZone(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: siteTimeZone() }).format(new Date(iso));
}

// Short plain-text summary for meta descriptions.
export function excerpt(text: string | null | undefined, max = 155): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
