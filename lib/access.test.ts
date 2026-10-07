// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginDestination, managerAreaRedirect, type Access } from "./access.ts";

const attendee: Access = { role: "attendee", organizerStatus: null, staffEventCount: 0 };
const organizer: Access = { role: "organizer", organizerStatus: "approved", staffEventCount: 0 };
const pending: Access = { role: "attendee", organizerStatus: "pending", staffEventCount: 0 };
const suspended: Access = { role: "organizer", organizerStatus: "suspended", staffEventCount: 0 };
const staff: Access = { role: "attendee", organizerStatus: null, staffEventCount: 2 };
const admin: Access = { role: "admin", organizerStatus: null, staffEventCount: 0 };

const href = (access: Access, mode: "book" | "manager", next: string | null = null) => {
  const destination = loginDestination(access, mode, next);
  return destination.kind === "redirect" ? destination.href : destination.kind;
};

describe("loginDestination", () => {
  it("never sends admins to the admin area (it has its own login)", () => {
    assert.equal(href(admin, "book"), "/");
    assert.equal(href(admin, "manager"), "apply_prompt");
    assert.equal(href(admin, "book", "/events/jazz"), "/events/jazz");
  });

  it("routes 'Manage events' by organizer status", () => {
    assert.equal(href(organizer, "manager"), "/manager");
    assert.equal(href(organizer, "manager", "/manager/events"), "/manager/events");
    assert.equal(href(organizer, "manager", "/events/jazz"), "/manager");
    assert.equal(href(pending, "manager"), "/manager/application");
    assert.equal(href(suspended, "manager"), "/manager/application");
    assert.equal(href(staff, "manager"), "/manager/check-in");
    assert.equal(href(attendee, "manager"), "apply_prompt");
  });

  it("routes 'Book tickets' back to where the person was", () => {
    assert.equal(href(attendee, "book"), "/");
    assert.equal(href(attendee, "book", "/events/jazz"), "/events/jazz");
    assert.equal(href(organizer, "book"), "/tickets");
    assert.equal(href(pending, "book", "/tickets"), "/tickets");
  });
});

describe("managerAreaRedirect", () => {
  it("lets approved organizers in", () => {
    assert.equal(managerAreaRedirect(organizer, "/manager"), null);
    assert.equal(managerAreaRedirect(organizer, "/manager/events/1"), null);
  });

  it("sends everyone else to their application page", () => {
    assert.equal(managerAreaRedirect(pending, "/manager"), "/manager/application");
    assert.equal(managerAreaRedirect(attendee, "/manager/events"), "/manager/application");
    assert.equal(managerAreaRedirect(admin, "/manager"), "/admin");
  });

  it("always allows the application page", () => {
    assert.equal(managerAreaRedirect(attendee, "/manager/application"), null);
  });

  it("allows check-in for organizers, door staff and admins only", () => {
    assert.equal(managerAreaRedirect(staff, "/manager/check-in"), null);
    assert.equal(managerAreaRedirect(admin, "/manager/check-in"), null);
    assert.equal(managerAreaRedirect(organizer, "/manager/check-in"), null);
    assert.equal(managerAreaRedirect(attendee, "/manager/check-in"), "/manager/application");
    assert.equal(managerAreaRedirect(staff, "/manager/events"), "/manager/check-in");
  });
});
