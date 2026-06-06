import type { SupabaseClient } from "@supabase/supabase-js";
import type { MoodCode } from "@/lib/moods";

type DB = SupabaseClient;

// Cột tường minh — KHÔNG select anon_id/anon_ip (danh tính/IP người xem, đã REVOKE ở 0007).
const COLS =
  "id, post_id, parent_id, user_id, author_name, body, mood, is_hidden, created_at";

// Domain type (camelCase) — ranh giới map snake_case (DB) <-> camelCase (TS).
export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  userId: string | null; // != null & == post.authorId => badge "tác giả"
  authorName: string;
  body: string;
  mood: MoodCode | null; // tùy chọn "bài này khiến mình thấy ___" (Lát 3)
  isHidden: boolean;
  createdAt: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string | null;
  author_name: string;
  body: string;
  mood: MoodCode | null;
  is_hidden: boolean;
  created_at: string;
}

function toComment(r: CommentRow): Comment {
  return {
    id: r.id,
    postId: r.post_id,
    parentId: r.parent_id,
    userId: r.user_id,
    authorName: r.author_name,
    body: r.body,
    mood: r.mood,
    isHidden: r.is_hidden,
    createdAt: r.created_at,
  };
}

/** Mọi bình luận chưa ẩn của một bài (gốc + trả lời), cũ -> mới. Defensive: lỗi -> []. */
export async function listComments(sb: DB, postId: string): Promise<Comment[]> {
  const { data, error } = await sb
    .from("comments")
    .select(COLS)
    .eq("post_id", postId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true })
    .limit(200); // chống phình render (DoS dung lượng); phân trang để sau nếu cần
  if (error || !data) return [];
  return (data as CommentRow[]).map(toComment);
}

export interface NewComment {
  postId: string;
  body: string;
  authorName: string;
  mood?: MoodCode | null;
  anonId?: string | null;
  userId?: string | null;
  parentId?: string | null;
}

/** Chèn bình luận (khách: userId null; tác giả đáp: userId = auth.uid()). RLS kiểm ràng buộc. */
export async function insertComment(sb: DB, input: NewComment): Promise<Comment> {
  const { data, error } = await sb
    .from("comments")
    .insert({
      post_id: input.postId,
      body: input.body,
      author_name: input.authorName,
      mood: input.mood ?? null,
      anon_id: input.anonId ?? null,
      user_id: input.userId ?? null,
      parent_id: input.parentId ?? null,
    })
    .select(COLS)
    .single();
  if (error || !data) throw error ?? new Error("insertComment failed");
  return toComment(data as CommentRow);
}

/** Tác giả ẩn một bình luận (gỡ khỏi công khai, giữ hàng). RLS chỉ cho author của bài. */
export async function hideComment(sb: DB, id: string): Promise<void> {
  const { error } = await sb
    .from("comments")
    .update({ is_hidden: true })
    .eq("id", id);
  if (error) throw error;
}

/** Tác giả xoá hẳn một bình luận (cascade trả lời theo FK). */
export async function deleteComment(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("comments").delete().eq("id", id);
  if (error) throw error;
}

/** Hộp thư tác giả: bình luận mới nhất trên các bài đã cho. Defensive: lỗi -> []. */
export async function listRecentCommentsForPosts(
  sb: DB,
  postIds: string[],
  limit = 50,
): Promise<Comment[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await sb
    .from("comments")
    .select(COLS)
    .in("post_id", postIds)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as CommentRow[]).map(toComment);
}
