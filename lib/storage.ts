import { supabase } from "@/lib/supabase";

export type ImageBucket = "event-images" | "site-images" | "avatars" | "organizer-logos";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Mirrors the bucket limits set in the database migration.
export const MAX_IMAGE_BYTES: Record<ImageBucket, number> = {
  "event-images": 5 * 1024 * 1024,
  "site-images": 5 * 1024 * 1024,
  avatars: 2 * 1024 * 1024,
  "organizer-logos": 2 * 1024 * 1024,
};

// Buckets that accept fewer types than IMAGE_TYPES (no GIF logos).
const BUCKET_TYPES: Partial<Record<ImageBucket, string[]>> = {
  "organizer-logos": ["image/jpeg", "image/png", "image/webp"],
};

export const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80";

export function publicImageUrl(bucket: ImageBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Uploaded image (image_path) wins over a legacy external URL (image_url).
export function eventImageSrc(imagePath: string | null, imageUrl: string | null): string {
  if (imagePath) return publicImageUrl("event-images", imagePath);
  return imageUrl || FALLBACK_EVENT_IMAGE;
}

export function validateImage(file: File, bucket: ImageBucket): string | null {
  const allowed = BUCKET_TYPES[bucket] ?? IMAGE_TYPES;
  if (!allowed.includes(file.type)) {
    return allowed.includes("image/gif") ? "Use a JPG, PNG, WebP or GIF image." : "Use a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES[bucket]) {
    return `Images must be ${MAX_IMAGE_BYTES[bucket] / (1024 * 1024)} MB or smaller.`;
  }
  return null;
}

export type UploadResult = { ok: true; path: string } | { ok: false; errorMessage: string };

// Uploads under "<folder>/<random>.<ext>" so names never collide or leak.
export async function uploadImage(bucket: ImageBucket, file: File, folder: string): Promise<UploadResult> {
  const problem = validateImage(file, bucket);
  if (problem) return { ok: false, errorMessage: problem };

  const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, path };
}
