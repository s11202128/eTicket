import { supabase } from "@/lib/supabase";
import type { EventStatus, Json } from "@/lib/database.types";
import { parseAnnouncement, parseHero } from "@/lib/siteContent";
import type {
  ActionResult,
  AnnouncementContent,
  EventOption,
  HeroContent,
} from "@/features/admin/model/admin.types";

export { DEFAULT_ANNOUNCEMENT, DEFAULT_HERO } from "@/lib/siteContent";

export async function getSiteContent(): Promise<{ hero: HeroContent; announcement: AnnouncementContent }> {
  const { data, error } = await supabase.from("site_content").select("key, value").in("key", ["hero", "announcement"]);
  if (error) throw new Error(error.message);
  const byKey = new Map(data.map((row) => [row.key, row.value]));
  return {
    hero: parseHero(byKey.get("hero")),
    announcement: parseAnnouncement(byKey.get("announcement")),
  };
}

async function saveContent(key: string, value: Json): Promise<ActionResult> {
  const { error } = await supabase.from("site_content").upsert({ key, value });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data: undefined };
}

export function saveHero(hero: HeroContent): Promise<ActionResult> {
  return saveContent("hero", {
    title: hero.title,
    subtitle: hero.subtitle,
    image_path: hero.imagePath,
    cta_text: hero.ctaText,
  });
}

export function saveAnnouncement(announcement: AnnouncementContent): Promise<ActionResult> {
  return saveContent("announcement", { text: announcement.text, enabled: announcement.enabled });
}

// Featured events in display order, plus published upcoming events that can be added.
export async function getFeaturedEditorData(): Promise<{ featured: EventOption[]; candidates: EventOption[] }> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, status, is_featured, featured_order")
    .or(`is_featured.eq.true,and(status.eq.published,starts_at.gte.${new Date().toISOString()})`)
    .order("starts_at");
  if (error) throw new Error(error.message);

  const toOption = (event: (typeof data)[number]): EventOption => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    status: event.status as EventStatus,
  });

  const featured = data
    .filter((event) => event.is_featured)
    .sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999))
    .map(toOption);
  const candidates = data.filter((event) => !event.is_featured).map(toOption);
  return { featured, candidates };
}

export async function saveFeaturedOrder(eventIds: string[]): Promise<ActionResult> {
  const { error } = await supabase.rpc("admin_set_featured_events", { p_event_ids: eventIds });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data: undefined };
}
