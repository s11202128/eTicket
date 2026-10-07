"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import { listMyEvents } from "@/features/manager/model/managerEvents.repository";
import { addStaff, listStaff, removeStaff, type StaffMember } from "@/features/manager/model/manager.repository";
import { eventHasEnded } from "@/features/manager/model/eventTabs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Events worth staffing: not cancelled/rejected and not long over.
async function listStaffableEvents() {
  const now = new Date();
  const events = await listMyEvents();
  return events.filter(
    (event) => !["cancelled", "rejected", "completed"].includes(event.status) && !eventHasEnded(event, now)
  );
}

export function useTeam(initialEventId: string | null) {
  const toast = useToast();
  const events = useAsyncData(listStaffableEvents, "team-events");
  const [chosenId, setChosenId] = useState<string | null>(initialEventId);
  const list = events.data ?? [];
  const eventId = chosenId && list.some((event) => event.id === chosenId) ? chosenId : (list[0]?.id ?? null);

  const staff = useAsyncData<StaffMember[]>(() => (eventId ? listStaff(eventId) : Promise.resolve([])), eventId ?? "none");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [noAccountEmail, setNoAccountEmail] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const chooseEvent = (id: string) => {
    setChosenId(id);
    setNoAccountEmail(null);
    const url = new URL(window.location.href);
    url.searchParams.set("event", id);
    window.history.replaceState(null, "", url);
  };

  const add = async () => {
    if (!eventId || isAdding) return;
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setIsAdding(true);
    setEmailError(null);
    setNoAccountEmail(null);
    try {
      const result = await addStaff(eventId, value);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      if (result.outcome === "no_account") {
        setNoAccountEmail(value);
        return;
      }
      toast.show(result.outcome === "added" ? `${value} can now check in guests.` : `${value} is already on the team.`, "success");
      setEmail("");
      await staff.reload();
    } finally {
      setIsAdding(false);
    }
  };

  const remove = async (member: StaffMember) => {
    if (!eventId) return;
    setRemoving(member.userId);
    try {
      const result = await removeStaff(eventId, member.userId);
      if (!result.ok) {
        toast.show(result.errorMessage, "error");
        return;
      }
      toast.show(`${member.name || member.email} removed.`, "success");
      await staff.reload();
    } finally {
      setRemoving(null);
    }
  };

  return {
    events: list,
    eventsLoading: events.isLoading,
    eventsError: events.error,
    eventId,
    chooseEvent,
    staff: staff.data ?? [],
    staffLoading: staff.isLoading,
    staffError: staff.error,
    email,
    setEmail: (value: string) => {
      setEmail(value);
      setEmailError(null);
    },
    emailError,
    noAccountEmail,
    isAdding,
    add,
    removing,
    remove,
  };
}
