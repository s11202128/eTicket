import { getAccessToken } from "@/features/auth/model/session.repository";
import type { AdminEventInput, AdminSnapshot, ManagedEvent } from "./admin.types";

async function adminRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const payload = response.status === 204
    ? ({} as T & { error?: string })
    : await response.json().catch(() => ({} as T & { error?: string }));
  if (!response.ok) throw new Error((payload as { error?: string }).error || "The request could not be completed.");
  return payload as T;
}

export function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>("/api/admin/events");
}

export async function verifyAdminAccess(): Promise<boolean> {
  try {
    const result = await adminRequest<{ authorized: boolean }>("/api/admin/session");
    return result.authorized;
  } catch {
    return false;
  }
}

export async function createManagedEvent(input: AdminEventInput): Promise<ManagedEvent> {
  const result = await adminRequest<{ event: ManagedEvent }>("/api/admin/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.event;
}

export async function updateManagedEvent(id: string, input: AdminEventInput): Promise<ManagedEvent> {
  const result = await adminRequest<{ event: ManagedEvent }>(`/api/admin/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return result.event;
}

export async function deleteManagedEvent(id: string): Promise<void> {
  await adminRequest(`/api/admin/events/${id}`, { method: "DELETE" });
}
