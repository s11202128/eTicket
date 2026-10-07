import { z } from "zod";

export const EVENT_TYPES = [
  "Music",
  "Festivals",
  "Sports",
  "Arts & Culture",
  "Church & Community",
  "Business & Conferences",
  "Education",
  "Food & Drink",
  "Nightlife",
  "Family",
] as const;

// Raw form values (as typed). Mirrors the database checks on organizer_profiles.
export type OrganizerFormValues = {
  organizationName: string;
  phone: string;
  city: string;
  website: string;
  eventTypes: string[];
  description: string;
};

export const EMPTY_ORGANIZER_FORM: OrganizerFormValues = {
  organizationName: "",
  phone: "",
  city: "",
  website: "",
  eventTypes: [],
  description: "",
};

const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

export const organizerFormSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter your organization or brand name.")
    .max(120, "Keep the name under 120 characters."),
  phone: z
    .string()
    .trim()
    .min(5, "Enter a phone number we can reach you on.")
    .max(40, "Keep the phone number under 40 characters."),
  city: optional(80, "Keep the city under 80 characters."),
  website: z
    .string()
    .trim()
    .max(300, "Keep the link under 300 characters.")
    .transform((value) => (value === "" || /^https?:\/\//i.test(value) ? value : `https://${value}`))
    .refine((value) => value === "" || URL.canParse(value), { message: "Enter a valid website or social link." })
    .transform((value) => (value === "" ? null : value)),
  eventTypes: z.array(z.string()).min(1, "Choose at least one type of event.").max(20),
  description: optional(2000, "Keep the description under 2000 characters."),
});

export type OrganizerApplicationInput = z.output<typeof organizerFormSchema>;

export type OrganizerFormErrors = Partial<Record<keyof OrganizerFormValues, string>>;

export function validateOrganizerForm(
  values: OrganizerFormValues
): { ok: true; data: OrganizerApplicationInput } | { ok: false; errors: OrganizerFormErrors } {
  const result = organizerFormSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const errors: OrganizerFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof OrganizerFormValues;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
