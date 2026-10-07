import { supabase } from "@/lib/supabase";
import type { OrganizerStatus, Tables } from "@/lib/database.types";
import { publicImageUrl, uploadImage, type UploadResult } from "@/lib/storage";
import type { OrganizerApplicationInput, OrganizerFormValues } from "@/features/organizer/model/organizer.schema";

export type OrganizerApplication = {
  organizationName: string;
  phone: string | null;
  city: string | null;
  website: string | null;
  eventTypes: string[];
  description: string | null;
  logoPath: string | null;
  status: OrganizerStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplyResult = { ok: true } | { ok: false; errorMessage: string };

function toApplication(row: Tables<"organizer_profiles">): OrganizerApplication {
  return {
    organizationName: row.organization_name,
    phone: row.phone,
    city: row.city,
    website: row.website,
    eventTypes: row.event_types,
    description: row.description,
    logoPath: row.logo_path,
    status: row.status as OrganizerStatus,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function applicationToFormValues(application: OrganizerApplication): OrganizerFormValues {
  return {
    organizationName: application.organizationName,
    phone: application.phone ?? "",
    city: application.city ?? "",
    website: application.website ?? "",
    eventTypes: application.eventTypes,
    description: application.description ?? "",
  };
}

// The signed-in user's organizer application, or null if they never applied.
export async function getMyApplication(): Promise<OrganizerApplication | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase.from("organizer_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toApplication(data) : null;
}

// Creates, updates (while pending) or resubmits (after rejection) the
// application. The database decides what's allowed.
export async function applyAsOrganizer(input: OrganizerApplicationInput, logoPath: string | null): Promise<ApplyResult> {
  const { error } = await supabase.rpc("apply_as_organizer", {
    p_organization_name: input.organizationName,
    p_phone: input.phone,
    p_city: input.city ?? undefined,
    p_website: input.website ?? undefined,
    p_event_types: input.eventTypes,
    p_description: input.description ?? undefined,
    p_logo_path: logoPath ?? undefined,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}

// Logos live in organizer-logos/<user id>/..., which only that user can write.
export async function uploadOrganizerLogo(file: File): Promise<UploadResult> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { ok: false, errorMessage: "Please sign in to upload a logo." };
  return uploadImage("organizer-logos", file, userId);
}

export const organizerLogoUrl = (path: string) => publicImageUrl("organizer-logos", path);
