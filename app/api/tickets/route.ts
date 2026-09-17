import { authenticateRequest, jsonError } from "@/lib/server/api";
import { getDemoState } from "@/lib/server/demo-store";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  let body: { eventId?: unknown; quantity?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const quantity = typeof body.quantity === "number" ? body.quantity : 1;
  if (!eventId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return jsonError("Choose between 1 and 10 tickets.", 400);
  }

  if (auth.demo) {
    const event = getDemoState().events.find((item) => item.id === eventId && item.published);
    if (!event) return jsonError("Event not found.", 404);
    if (event.remainingTickets < quantity) return jsonError("There are not enough tickets remaining.", 409);
    const reference = `ET-${Date.now().toString(36).toUpperCase()}`;
    const ticket = {
      id: `demo-${Date.now()}`,
      eventId: event.id,
      eventTitle: event.title,
      startsAt: event.startsAt,
      venue: event.venue,
      location: event.location,
      imageUrl: event.imageUrl,
      status: "active" as const,
      quantity,
      totalPriceCents: event.priceCents * quantity,
      currency: event.currency,
      bookingReference: reference,
      qrData: reference,
    };
    const demoState = getDemoState();
    demoState.tickets.unshift(ticket);
    event.ticketsSold += quantity;
    event.remainingTickets -= quantity;
    event.updatedAt = new Date().toISOString();
    return Response.json(
      { ticket },
      { status: 201 },
    );
  }

  const { data, error } = await auth.client!.rpc("book_event_ticket", {
    p_event_id: eventId,
    p_quantity: quantity,
  });

  if (error) {
    const status = error.message.includes("enough tickets") ? 409 : 400;
    const safeMessage = error.message.includes("enough tickets")
      ? "There are not enough tickets remaining."
      : error.message.includes("already started")
        ? "This event has already started."
        : error.message.includes("not found")
          ? "Event not found."
          : "Unable to book this event.";
    return jsonError(safeMessage, status);
  }

  return Response.json({ ticket: data }, { status: 201 });
}
