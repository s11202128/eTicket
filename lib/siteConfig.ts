// Business details shown in the footer and on the info pages.
// Sections with nothing filled in are hidden, so the site never shows
// placeholder links or payment logos you don't actually support.

export type SocialPlatform = "facebook" | "instagram" | "x" | "tiktok" | "youtube" | "linkedin";

export const siteConfig = {
  name: "E-Ticket",
  tagline: "Book concerts, sports, festivals and more in seconds.",

  // Every price on the site, the footer note and search-engine data use this.
  // code: ISO 4217 code; symbol: shown before amounts (browsers have no
  // symbol for SBD, so we set the local "SI$" ourselves).
  currency: { code: "SBD", name: "Solomon Islands Dollars", symbol: "SI$" },

  contactEmail: "support@eticket.com",
  // Solomon Islands number (+677 country code, used for tap-to-call).
  contactPhone: "+677 747 8369",

  // Paste each profile URL into href. Until then the icon is shown but isn't
  // a link, so visitors never hit a broken page.
  socials: [
    { platform: "facebook", href: "" },
    { platform: "instagram", href: "" },
    { platform: "linkedin", href: "" },
  ] as { platform: SocialPlatform; href: string }[],

  // Payments come later. Only list methods you really accept, e.g. ["Visa", "Mastercard"].
  acceptedPayments: [] as string[],
};
