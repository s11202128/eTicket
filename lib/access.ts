// Who the signed-in person is, and where they should land after logging in.
// Pure functions only (no imports at runtime) so they can be unit-tested.

import type { OrganizerStatus, UserRole } from "./database.types.ts";

export type Access = {
  role: UserRole;
  organizerStatus: OrganizerStatus | null;
  staffEventCount: number;
};

export type LoginMode = "book" | "manager";

export type LoginDestination =
  | { kind: "redirect"; href: string }
  // Signed in with "Manage events" but has no organizer account yet.
  | { kind: "apply_prompt" };

export const isApprovedOrganizer = (access: Access) => access.organizerStatus === "approved";

export const canUseCheckIn = (access: Access) =>
  access.role === "admin" || isApprovedOrganizer(access) || access.staffEventCount > 0;

/**
 * - Admins: the admin dashboard (or the page that asked them to sign in).
 * - "Manage events": approved organizers to /manager; applicants (pending,
 *   rejected, suspended) to their application status; door staff to the
 *   scanner; everyone else gets an "apply now" prompt.
 * - "Book tickets": back to the page that asked for sign-in, otherwise
 *   My tickets for organizers and the homepage for attendees.
 */
export function loginDestination(access: Access, mode: LoginMode, next: string | null): LoginDestination {
  if (access.role === "admin") {
    return { kind: "redirect", href: next ?? "/admin" };
  }

  if (mode === "manager") {
    if (isApprovedOrganizer(access)) {
      return { kind: "redirect", href: next?.startsWith("/manager") ? next : "/manager" };
    }
    if (access.organizerStatus) {
      return { kind: "redirect", href: "/manager/application" };
    }
    if (access.staffEventCount > 0) {
      return { kind: "redirect", href: "/manager/check-in" };
    }
    return { kind: "apply_prompt" };
  }

  return { kind: "redirect", href: next ?? (isApprovedOrganizer(access) ? "/tickets" : "/") };
}

/** Where /manager/* sends people who can't use the page they asked for. */
export function managerAreaRedirect(access: Access, pathname: string): string | null {
  if (pathname === "/manager/application" || pathname.startsWith("/manager/application/")) return null;

  const isCheckIn = pathname === "/manager/check-in" || pathname.startsWith("/manager/check-in/");
  if (isCheckIn && canUseCheckIn(access)) return null;
  if (isApprovedOrganizer(access)) return null;

  // Not an organizer: admins go to their own dashboard, door staff to the
  // scanner (the only manager page they use), everyone else to their application.
  if (access.role === "admin") return "/admin";
  if (access.staffEventCount > 0) return "/manager/check-in";
  return "/manager/application";
}
