import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient;

const UNIQUE_VIOLATION = "23505";

/**
 * Thả tim (anon key + RLS insert-only). UNIQUE(post_id, anon_id) chống double-tap:
 * lỗi 23505 được coi là "đã thả rồi" (thành công im lặng), KHÔNG ném lỗi.
 */
export async function addHeart(
  sb: DB,
  postId: string,
  anonId: string,
): Promise<{ ok: true; already: boolean }> {
  const { error } = await sb
    .from("hearts")
    .insert({ post_id: postId, anon_id: anonId });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { ok: true, already: true };
    throw error;
  }
  return { ok: true, already: false };
}

/** Gỡ tim (best-effort theo (post_id, anon_id)) — policy DELETE thêm ở Story 3.2. */
export async function removeHeart(
  sb: DB,
  postId: string,
  anonId: string,
): Promise<void> {
  const { error } = await sb
    .from("hearts")
    .delete()
    .eq("post_id", postId)
    .eq("anon_id", anonId);
  if (error) throw error;
}

/**
 * Đếm tổng tim cho MỘT bài — author-only (RLS hearts_author_read).
 * Dùng ở /me. Người xem anon sẽ nhận 0 vì RLS chặn SELECT.
 */
export async function countForPost(sb: DB, postId: string): Promise<number> {
  const { count, error } = await sb
    .from("hearts")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error || count == null) return 0;
  return count;
}
