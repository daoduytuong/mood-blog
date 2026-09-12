import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient;
const UNIQUE_VIOLATION = "23505";

/** Thả tim album (anon INSERT + RLS). 23505 = đã thả rồi -> thành công im lặng. */
export async function addAlbumHeart(
  sb: DB,
  albumId: string,
  anonId: string,
): Promise<{ ok: true; already: boolean }> {
  const { error } = await sb
    .from("album_hearts")
    .insert({ album_id: albumId, anon_id: anonId });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { ok: true, already: true };
    throw error;
  }
  return { ok: true, already: false };
}

/** Gỡ tim album — best-effort theo (album_id, anon_id) của chính mình. */
export async function removeAlbumHeart(sb: DB, albumId: string, anonId: string): Promise<void> {
  const { error } = await sb
    .from("album_hearts")
    .delete()
    .eq("album_id", albumId)
    .eq("anon_id", anonId);
  if (error) throw error;
}

/** Tổng tim CÔNG KHAI một album qua view album_heart_counts. Chưa publish -> 0. */
export async function countForAlbum(sb: DB, albumId: string): Promise<number> {
  const { data, error } = await sb
    .from("album_heart_counts")
    .select("heart_count")
    .eq("album_id", albumId)
    .maybeSingle();
  if (error || !data) return 0;
  return (data as { heart_count: number }).heart_count;
}

/** Tổng tim theo album cho tác giả (RLS album_hearts_author_read). Anon nhận {}. */
export async function countsForAuthorAlbums(sb: DB): Promise<Record<string, number>> {
  const { data, error } = await sb.from("album_hearts").select("album_id");
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as { album_id: string }[])
    counts[row.album_id] = (counts[row.album_id] ?? 0) + 1;
  return counts;
}
