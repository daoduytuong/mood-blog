import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/features/compose/slug";
import { albumSlugExists } from "@/lib/db/albums";

// Slug duy nhất cho album (kiểm DB, KHÔNG lọc is_published). Cùng quy tắc với uniqueSlug của bài.
export async function uniqueAlbumSlug(
  sb: SupabaseClient,
  hint: string,
  fallbackPrefix: string,
): Promise<string> {
  const base = slugify(hint) || `${fallbackPrefix}-${Date.now().toString(36)}`;
  let slug = base;
  for (let i = 2; await albumSlugExists(sb, slug); i++) slug = `${base}-${i}`;
  return slug;
}
