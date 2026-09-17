import { demoEvents } from "@/lib/demo-data";
import { createServerClient, isServerDemoMode, jsonError } from "@/lib/server/api";

export async function GET() {
  if (isServerDemoMode()) return Response.json({ events: demoEvents });

  const client = createServerClient();
  if (!client) return jsonError("The database is not configured.", 503);

  const { data, error } = await client
    .from("events")
    .select("id,title,description,category,venue,location,starts_at,image_url,price_cents,currency,capacity,tickets_sold,featured")
    .eq("published", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) return jsonError("Unable to load events.", 500);

  return Response.json({
    events: (data ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue,
      location: event.location,
      startsAt: event.starts_at,
      imageUrl: event.image_url,
      priceCents: event.price_cents,
      currency: event.currency,
      capacity: event.capacity,
      remainingTickets: Math.max(event.capacity - event.tickets_sold, 0),
      featured: event.featured,
    })),
  });
}
