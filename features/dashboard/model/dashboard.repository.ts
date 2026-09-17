import { getAccessToken } from "@/features/auth/model/session.repository";
import type { DashboardSnapshot, Event, Ticket, UserProfile } from "./dashboard.types";

async function authenticatedRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return authenticatedRequest<DashboardSnapshot>("/api/dashboard");
}

export async function bookEvent(eventId: string, quantity: number): Promise<Ticket> {
  const result = await authenticatedRequest<{ ticket: Ticket }>("/api/tickets", {
    method: "POST",
    body: JSON.stringify({ eventId, quantity }),
  });
  return result.ticket;
}

export async function updateProfile(
  profile: Pick<UserProfile, "displayName" | "phone">,
): Promise<void> {
  await authenticatedRequest("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export async function fetchPublicEvents(): Promise<Event[]> {
  const response = await fetch("/api/events");
  const payload = (await response.json().catch(() => ({}))) as {
    events?: Event[];
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || "Unable to load events.");
  return payload.events ?? [];
}
