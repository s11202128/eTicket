import { authenticateAdminRequest, jsonError } from "@/lib/server/api";
import { getDemoState } from "@/lib/server/demo-store";
import {
  ADMIN_EVENT_COLUMNS,
  mapManagedEvent,
  parseEventInput,
  toEventRow,
} from "@/lib/server/admin-events";

type EventRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: EventRouteContext) {
  const auth = await authenticateAdminRequest(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }
  const parsed = parseEventInput(body);
  if (!parsed.input) return jsonError(parsed.error || "Invalid event details.", 400);

  if (auth.demo) {
    const event = getDemoState().events.find((item) => item.id === id);
    if (!event) return jsonError("Event not found.", 404);
    if (parsed.input.capacity < event.ticketsSold) {
      return jsonError(`Capacity cannot be below the ${event.ticketsSold} tickets already issued.`, 409);
    }
    Object.assign(event, parsed.input, {
      remainingTickets: parsed.input.capacity - event.ticketsSold,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ event });
  }

  const { data: existing, error: lookupError } = await auth.client!
    .from("events")
    .select("tickets_sold")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return jsonError("Unable to inspect the event.", 500);
  if (!existing) return jsonError("Event not found.", 404);
  if (parsed.input.capacity < existing.tickets_sold) {
    return jsonError(`Capacity cannot be below the ${existing.tickets_sold} tickets already issued.`, 409);
  }

  const { data, error } = await auth.client!
    .from("events")
    .update(toEventRow(parsed.input))
    .eq("id", id)
    .select(ADMIN_EVENT_COLUMNS)
    .single();
  if (error || !data) return jsonError("Unable to update the event.", 500);
  return Response.json({ event: mapManagedEvent(data) });
}

export async function DELETE(request: Request, context: EventRouteContext) {
  const auth = await authenticateAdminRequest(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;

  if (auth.demo) {
    const state = getDemoState();
    const index = state.events.findIndex((event) => event.id === id);
    if (index < 0) return jsonError("Event not found.", 404);
    if (state.events[index].ticketsSold > 0) {
      return jsonError("Events with issued tickets cannot be deleted. Unpublish this event instead.", 409);
    }
    state.events.splice(index, 1);
    return new Response(null, { status: 204 });
  }

  const { data: existing, error: lookupError } = await auth.client!
    .from("events")
    .select("tickets_sold")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return jsonError("Unable to inspect the event.", 500);
  if (!existing) return jsonError("Event not found.", 404);
  if (existing.tickets_sold > 0) {
    return jsonError("Events with issued tickets cannot be deleted. Unpublish this event instead.", 409);
  }

  const { error } = await auth.client!.from("events").delete().eq("id", id);
  if (error) return jsonError("Unable to delete the event.", 500);
  return new Response(null, { status: 204 });
}
