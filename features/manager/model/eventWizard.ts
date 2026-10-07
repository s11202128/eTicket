// Organizer event wizard: form values, per-step validation and the "this
// change sends your event back for review" check. Pure, unit-tested.

import { z } from "zod";

export type WizardStep = "basics" | "schedule" | "tickets" | "media";

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "schedule", label: "Date & venue" },
  { id: "tickets", label: "Tickets" },
  { id: "media", label: "Media & review" },
];

export type TicketTypeValues = {
  // Database id once saved; null for new rows.
  id: string | null;
  // Stable React key for rows that have no id yet.
  key: string;
  name: string;
  price: string;
  quantity: string;
  salesStart: string;
  salesEnd: string;
  // Tickets already sold (quantity can't go below this).
  sold: number;
};

// Strings as typed into inputs; datetime fields are <input type="datetime-local"> values.
export type WizardValues = {
  title: string;
  categoryId: string;
  description: string;
  startsAt: string;
  endAt: string;
  location: string;
  region: "solomon_islands" | "pacific" | "international";
  maxTicketsPerUser: string;
  ticketTypes: TicketTypeValues[];
  imagePath: string | null;
};

export type WizardErrors = Record<string, string>;

const isWholeNumber = (value: string, min: number) => Number.isInteger(Number(value)) && Number(value) >= min;
const isMoney = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
const time = (value: string) => (value ? new Date(value).getTime() : NaN);

const basicsSchema = z.object({
  title: z.string().trim().min(3, "Give your event a title (at least 3 characters).").max(120, "Keep the title under 120 characters."),
  description: z.string().max(5000, "Keep the description under 5000 characters."),
});

function validateBasics(values: WizardValues, errors: WizardErrors, forSubmit: boolean) {
  const result = basicsSchema.safeParse(values);
  if (!result.success) {
    for (const issue of result.error.issues) errors[String(issue.path[0])] ??= issue.message;
  }
  if (forSubmit && values.description.trim().length < 20) {
    errors.description ??= "Describe your event in at least 20 characters.";
  }
}

function validateSchedule(values: WizardValues, errors: WizardErrors, now: Date) {
  const start = time(values.startsAt);
  if (Number.isNaN(start)) errors.startsAt = "Choose when the event starts.";
  else if (start <= now.getTime()) errors.startsAt = "The start must be in the future.";

  if (values.endAt) {
    const end = time(values.endAt);
    if (Number.isNaN(end)) errors.endAt = "Enter a valid end date and time.";
    else if (!Number.isNaN(start) && end <= start) errors.endAt = "The end must be after the start.";
  }

  const location = values.location.trim();
  if (location.length < 2) errors.location = "Where is the event? Add the venue and town.";
  else if (location.length > 200) errors.location = "Keep the location under 200 characters.";
}

function validateTickets(values: WizardValues, errors: WizardErrors) {
  if (!isWholeNumber(values.maxTicketsPerUser, 1) || Number(values.maxTicketsPerUser) > 50) {
    errors.maxTicketsPerUser = "Choose between 1 and 50 tickets per person.";
  }
  if (values.ticketTypes.length === 0) {
    errors.ticketTypes = "Add at least one ticket type.";
    return;
  }

  const names = new Set<string>();
  const eventEnd = time(values.endAt || values.startsAt);
  values.ticketTypes.forEach((type, index) => {
    const at = (field: string) => `ticketTypes.${index}.${field}`;
    const name = type.name.trim().toLowerCase();
    if (!name) errors[at("name")] = "Name this ticket type.";
    else if (type.name.trim().length > 60) errors[at("name")] = "Keep the name under 60 characters.";
    else if (names.has(name)) errors[at("name")] = "Each ticket type needs a different name.";
    names.add(name);

    if (!isMoney(type.price)) errors[at("price")] = "Price must be 0 or more.";

    if (type.quantity.trim() !== "") {
      if (!isWholeNumber(type.quantity, 1)) errors[at("quantity")] = "Use a whole number, or leave empty for unlimited.";
      else if (Number(type.quantity) < type.sold) errors[at("quantity")] = `${type.sold} already sold; quantity can't be lower.`;
    }

    const salesStart = time(type.salesStart);
    const salesEnd = time(type.salesEnd);
    if (type.salesStart && Number.isNaN(salesStart)) errors[at("salesStart")] = "Enter a valid date and time.";
    if (type.salesEnd && Number.isNaN(salesEnd)) errors[at("salesEnd")] = "Enter a valid date and time.";
    if (!Number.isNaN(salesStart) && !Number.isNaN(salesEnd) && salesEnd <= salesStart) {
      errors[at("salesEnd")] = "Sales must end after they start.";
    } else if (!Number.isNaN(salesEnd) && !Number.isNaN(eventEnd) && salesEnd > eventEnd) {
      errors[at("salesEnd")] = "Sales must end before the event ends.";
    }
  });
}

export function validateStep(step: WizardStep, values: WizardValues, now: Date): WizardErrors {
  const errors: WizardErrors = {};
  if (step === "basics") validateBasics(values, errors, false);
  if (step === "schedule") validateSchedule(values, errors, now);
  if (step === "tickets") validateTickets(values, errors);
  return errors;
}

// Everything the database checks in submit_event_for_review, so organizers
// see the problems next to the fields instead of as one message.
export function validateForSubmit(values: WizardValues, now: Date): { errors: WizardErrors; firstStep: WizardStep | null } {
  const errors: WizardErrors = {};
  validateBasics(values, errors, true);
  const afterBasics = Object.keys(errors).length;
  validateSchedule(values, errors, now);
  const afterSchedule = Object.keys(errors).length;
  validateTickets(values, errors);
  const afterTickets = Object.keys(errors).length;

  const firstStep: WizardStep | null =
    afterBasics > 0 ? "basics" : afterSchedule > 0 ? "schedule" : afterTickets > 0 ? "tickets" : null;
  return { errors, firstStep };
}

// ---------------------------------------------------------------------------
// Live events: which edits need another review (mirrors update_published_event)
// ---------------------------------------------------------------------------
export type LiveChangeSummary = {
  changed: boolean;
  requiresReview: boolean;
  // Human-readable list of the changes that need review.
  majorChanges: string[];
};

export function liveChangeSummary(original: WizardValues, edited: WizardValues): LiveChangeSummary {
  const major: string[] = [];
  let minor = false;

  if (edited.title.trim() !== original.title.trim()) major.push("title");
  if (edited.startsAt !== original.startsAt) major.push("start time");
  if (edited.endAt !== original.endAt) major.push("end time");
  if (edited.location.trim() !== original.location.trim()) major.push("venue");
  if (edited.region !== original.region) major.push("region");
  if (edited.categoryId !== original.categoryId) major.push("category");
  if (edited.maxTicketsPerUser !== original.maxTicketsPerUser) major.push("tickets per person");
  if (edited.description.trim() !== original.description.trim()) minor = true;
  if (edited.imagePath !== original.imagePath) minor = true;

  let priceChanged = false;
  let quantityLowered = false;
  for (const type of edited.ticketTypes) {
    const before = original.ticketTypes.find((item) => item.id === type.id);
    if (!before) continue;
    if (Number(type.price) !== Number(before.price)) priceChanged = true;
    if (type.quantity !== before.quantity) {
      const next = type.quantity.trim() === "" ? null : Number(type.quantity);
      const prev = before.quantity.trim() === "" ? null : Number(before.quantity);
      if (next !== null && (prev === null || next < prev)) quantityLowered = true;
      else minor = true;
    }
  }
  if (priceChanged) major.push("ticket prices");
  if (quantityLowered) major.push("lower ticket quantities");

  return { changed: major.length > 0 || minor, requiresReview: major.length > 0, majorChanges: major };
}
