import { getDemoState, toPublicDemoEvent } from "@/lib/server/demo-store";
import { authenticateRequest, jsonError } from "@/lib/server/api";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  if (auth.demo) {
    const demoState = getDemoState();
    return Response.json({
      profile: demoState.profile,
      events: demoState.events
        .filter((event) => event.published && new Date(event.startsAt) >= new Date())
        .map(toPublicDemoEvent),
      tickets: demoState.tickets,
      updatedAt: new Date().toISOString(),
    });
  }

  const client = auth.client!;
  const [profileResult, eventsResult, ticketsResult] = await Promise.all([
    client.from("profiles").select("full_name,email,phone,avatar_url,role").eq("id", auth.user.id).maybeSingle(),
    client
      .from("events")
      .select("id,title,description,category,venue,location,starts_at,image_url,price_cents,currency,capacity,tickets_sold,featured")
      .eq("published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
    client
      .from("tickets")
      .select("id,event_id,quantity,unit_price_cents,currency,booking_reference,status,events(title,starts_at,venue,location,image_url)")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error || eventsResult.error || ticketsResult.error) {
    return jsonError("Unable to load your dashboard.", 500);
  }

  const events = (eventsResult.data ?? []).map((event) => ({
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
  }));

  const tickets = (ticketsResult.data ?? []).map((ticket) => {
    const joinedEvent = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    const startsAt = joinedEvent?.starts_at ?? new Date().toISOString();
    return {
      id: ticket.id,
      eventId: ticket.event_id,
      eventTitle: joinedEvent?.title ?? "Event",
      startsAt,
      venue: joinedEvent?.venue ?? "",
      location: joinedEvent?.location ?? "",
      imageUrl: joinedEvent?.image_url ?? "",
      status: new Date(startsAt) < new Date() ? "used" : ticket.status,
      quantity: ticket.quantity,
      totalPriceCents: ticket.quantity * ticket.unit_price_cents,
      currency: ticket.currency,
      bookingReference: ticket.booking_reference,
      qrData: ticket.booking_reference,
    };
  });

  return Response.json({
    profile: {
      displayName: profileResult.data?.full_name || auth.user.email?.split("@")[0] || "Guest",
      email: profileResult.data?.email || auth.user.email || "",
      phone: profileResult.data?.phone || "",
      avatarUrl: profileResult.data?.avatar_url || null,
      role: profileResult.data?.role === "admin" ? "admin" : "customer",
    },
    events,
    tickets,
    updatedAt: new Date().toISOString(),
  });
}
