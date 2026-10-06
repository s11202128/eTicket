import { supabase } from "@/lib/supabase";
import type {
  CreateEventInput,
  EventRecord,
  EventResult,
} from "@/features/events/model/events.types";

export async function createEvent(input: CreateEventInput): Promise<EventResult> {
  // created_by defaults to auth.uid() in the database.
  const { error } = await supabase.from("events").insert({
    title: input.title,
    description: input.description,
    starts_at: input.startsAt,
    location: input.location,
    price: input.price,
    image_url: input.imageUrl,
  });

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true };
}

export async function listUpcomingEvents(limit = 6): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
