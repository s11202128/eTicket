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

  // e.g. "support@yourdomain.com"
  contactEmail: "",
  // e.g. "+675 123 4567"
  contactPhone: "",

  // e.g. { platform: "facebook", href: "https://facebook.com/yourpage" }
  socials: [] as { platform: SocialPlatform; href: string }[],

  // Only list methods you really accept, e.g. ["Visa", "Mastercard", "M-PAiSA"]
  acceptedPayments: [] as string[],
};
