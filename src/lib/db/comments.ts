import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient;

// Domain type (camelCase) — ranh giới map snake_case (DB) <-> camelCase (TS).
export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  userId: string | null; // != null & == post.authorId => badge "tác giả"
  authorName: string;
  body: string;
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
    isHidden: r.is_hidden,
    createdAt: r.created_at,
  };
}

/** Mọi bình luận chưa ẩn của một bài (gốc + trả lời), cũ -> mới. Defensive: lỗi -> []. */
export async function listComments(sb: DB, postId: string): Promise<Comment[]> {
  const { data, error } = await sb
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as CommentRow[]).map(toComment);
}

export interface NewComment {
  postId: string;
  body: string;
  authorName: string;
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
      anon_id: input.anonId ?? null,
      user_id: input.userId ?? null,
      parent_id: input.parentId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertComment failed");
  return toComment(data as CommentRow);
}
