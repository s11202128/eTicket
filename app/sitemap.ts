import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { siteUrl } from "@/lib/site";

// Rebuilt at most once an hour.
export const revalidate = 3600;

// Homepage, events list and every published upcoming event. Uses a plain
// anonymous client (no cookies), so it only ever sees public data.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    ...["/about", "/contact", "/terms", "/privacy", "/refunds"].map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase
    .from("events")
    .select("slug, updated_at")
    .eq("status", "published")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(5000);

  for (const event of data ?? []) {
    pages.push({
      url: `${base}/events/${event.slug}`,
      lastModified: event.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return pages;
}
