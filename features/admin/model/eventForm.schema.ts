import { z } from "zod";

// Raw form values are strings (as typed into inputs); the schema validates
// them and converts to the types the database expects.
export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120, "Keep the title under 120 characters."),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .max(80, "Keep the slug under 80 characters.")
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes."),
    description: z.string().trim().max(5000, "Keep the description under 5000 characters."),
    startsAt: z.string().min(1, "Start date and time are required."),
    endAt: z.string(),
    location: z.string().trim().min(1, "Location is required.").max(200),
    price: z
      .string()
      .trim()
      .refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, {
        message: "Price must be 0 or more.",
      })
      .transform((value) => Math.round(Number(value) * 100) / 100),
    capacity: z
      .string()
      .trim()
      .refine((value) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 1), {
        message: "Capacity must be a whole number of at least 1, or empty for unlimited.",
      })
      .transform((value) => (value === "" ? null : Number(value))),
    maxTicketsPerUser: z
      .string()
      .trim()
      .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 50, {
        message: "Choose between 1 and 50 tickets per person.",
      })
      .transform(Number),
    categoryId: z.string().transform((value) => (value === "" ? null : value)),
    region: z.enum(["solomon_islands", "pacific", "international"], { message: "Choose a region." }),
    imagePath: z.string().nullable(),
    status: z.enum(["draft", "published"]),
    isFeatured: z.boolean(),
  })
  .superRefine((values, context) => {
    const start = new Date(values.startsAt);
    if (Number.isNaN(start.getTime())) {
      context.addIssue({ code: "custom", path: ["startsAt"], message: "Enter a valid start date and time." });
      return;
    }
    if (values.endAt) {
      const end = new Date(values.endAt);
      if (Number.isNaN(end.getTime())) {
        context.addIssue({ code: "custom", path: ["endAt"], message: "Enter a valid end date and time." });
      } else if (end <= start) {
        context.addIssue({ code: "custom", path: ["endAt"], message: "End must be after the start." });
      }
    }
  });

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormOutput = z.output<typeof eventFormSchema>;
export type EventFormErrors = Partial<Record<keyof EventFormInput, string>>;

export function validateEventForm(
  values: EventFormInput
): { ok: true; data: EventFormOutput } | { ok: false; errors: EventFormErrors } {
  const parsed = eventFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: EventFormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof EventFormInput | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
