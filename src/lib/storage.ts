import { env } from "@/env";

// Public URL của một object trong bucket "media" (bucket public).
export function mediaPublicUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

// Public URL của một ảnh trong bucket "photos" (khu /anh, migration 0012).
export function photoPublicUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
