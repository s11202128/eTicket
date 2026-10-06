import type { Json } from "@/lib/database.types";
import type { AnnouncementContent, HeroContent } from "@/features/admin/model/admin.types";

// Parsing for site_content values. Shared by the admin editor (browser) and
// the public pages (server), so it must not import a Supabase client.

export const DEFAULT_HERO: HeroContent = {
  title: "Find your next live experience",
  subtitle: "Concerts, sports, festivals and more. Book your tickets in seconds.",
  imagePath: null,
  ctaText: "Browse events",
};

export const DEFAULT_ANNOUNCEMENT: AnnouncementContent = { text: "", enabled: false };

type JsonObject = { [key: string]: Json | undefined };

function asObject(value: Json | undefined): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function str(value: Json | undefined, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function parseHero(value: Json | undefined): HeroContent {
  const object = asObject(value);
  return {
    title: str(object.title, DEFAULT_HERO.title),
    subtitle: str(object.subtitle, DEFAULT_HERO.subtitle),
    imagePath: typeof object.image_path === "string" ? object.image_path : null,
    ctaText: str(object.cta_text, DEFAULT_HERO.ctaText),
  };
}

export function parseAnnouncement(value: Json | undefined): AnnouncementContent {
  const object = asObject(value);
  return {
    text: str(object.text, ""),
    enabled: object.enabled === true,
  };
}
