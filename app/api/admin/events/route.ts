import { randomUUID } from "node:crypto";
import { authenticateAdminRequest, jsonError } from "@/lib/server/api";
import { getDemoState } from "@/lib/server/demo-store";
import {
  ADMIN_EVENT_COLUMNS,
  calculateOverview,
  mapManagedEvent,
  parseEventInput,
  toEventRow,
} from "@/lib/server/admin-events";

export async function GET(request: Request) {
  const auth = await authenticateAdminRequest(request);
  if (auth instanceof Response) return auth;

  if (auth.demo) {
    const events = [...getDemoState().events].sort((left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    return Response.json({ events, overview: calculateOverview(events), updatedAt: new Date().toISOString() });
  }

  const { data, error } = await auth.client!
    .from("events")
    .select(ADMIN_EVENT_COLUMNS)
    .order("starts_at", { ascending: true });
  if (error) return jsonError("Unable to load the event catalogue.", 500);
  const events = (data ?? []).map((row) => mapManagedEvent(row));
  return Response.json({ events, overview: calculateOverview(events), updatedAt: new Date().toISOString() });
}

export async function POST(request: Request) {
  const auth = await authenticateAdminRequest(request);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }
  const parsed = parseEventInput(body);
  if (!parsed.input) return jsonError(parsed.error || "Invalid event details.", 400);

  if (auth.demo) {
    const now = new Date().toISOString();
    const event = {
      id: randomUUID(),
      ...parsed.input,
      ticketsSold: 0,
      remainingTickets: parsed.input.capacity,
      createdAt: now,
      updatedAt: now,
    };
    getDemoState().events.push(event);
    return Response.json({ event }, { status: 201 });
  }

  const { data, error } = await auth.client!
    .from("events")
    .insert(toEventRow(parsed.input))
    .select(ADMIN_EVENT_COLUMNS)
    .single();
  if (error || !data) return jsonError("Unable to create the event.", 500);
  return Response.json({ event: mapManagedEvent(data) }, { status: 201 });
}
