// Business details shown in the footer and on the info pages.
// Sections with nothing filled in are hidden, so the site never shows
// placeholder links or payment logos you don't actually support.

export type SocialPlatform = "facebook" | "instagram" | "x" | "tiktok" | "youtube" | "linkedin";

export const siteConfig = {
  name: "E-Ticket",
  tagline: "Book concerts, sports, festivals and more in seconds.",

  // ISO 4217 code used for every price on the site (and the footer note).
  currency: { code: "USD", name: "US Dollars" },

  // e.g. "support@yourdomain.com"
  contactEmail: "",
  // e.g. "+675 123 4567"
  contactPhone: "",

  // e.g. { platform: "facebook", href: "https://facebook.com/yourpage" }
  socials: [] as { platform: SocialPlatform; href: string }[],

  // Only list methods you really accept, e.g. ["Visa", "Mastercard", "M-PAiSA"]
  acceptedPayments: [] as string[],
};
