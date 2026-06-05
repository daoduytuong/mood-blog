import { env } from "@/env";

// Public URL của một object trong bucket "media" (bucket public).
export function mediaPublicUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}
