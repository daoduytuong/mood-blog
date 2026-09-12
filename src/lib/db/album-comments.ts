import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlbumCommentRow } from "@/lib/db/types";

type DB = SupabaseClient;

// Cột tường minh — KHÔNG có anon_id/anon_ip (0012 không grant SELECT hai cột đó).
const COLS = "id, album_id, parent_id, user_id, author_name, body, is_hidden, created_at";

export interface AlbumComment {
  id: string;
  albumId: string;
  parentId: string | null;
  userId: string | null; // != null & == album.authorId => badge "tác giả"
  authorName: string;
  body: string;
  isHidden: boolean;
  createdAt: string;
}

function toComment(r: AlbumCommentRow): AlbumComment {
  return {
    id: r.id,
    albumId: r.album_id,
    parentId: r.parent_id,
    userId: r.user_id,
    authorName: r.author_name,
    body: r.body,
    isHidden: r.is_hidden,
    createdAt: r.created_at,
  };
}

/** Bình luận chưa ẩn của một album (gốc + trả lời), cũ -> mới. Lỗi -> []. */
export async function listAlbumComments(sb: DB, albumId: string): Promise<AlbumComment[]> {
  const { data, error } = await sb
    .from("album_comments")
    .select(COLS)
    .eq("album_id", albumId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return (data as AlbumCommentRow[]).map(toComment);
}

export interface NewAlbumComment {
  albumId: string;
  body: string;
  authorName: string;
  anonId?: string | null;
  userId?: string | null;
  parentId?: string | null;
}

export async function insertAlbumComment(sb: DB, input: NewAlbumComment): Promise<AlbumComment> {
  const { data, error } = await sb
    .from("album_comments")
    .insert({
      album_id: input.albumId,
      body: input.body,
      author_name: input.authorName,
      anon_id: input.anonId ?? null,
      user_id: input.userId ?? null,
      parent_id: input.parentId ?? null,
    })
    .select(COLS)
    .single();
  if (error || !data) throw error ?? new Error("insertAlbumComment failed");
  return toComment(data as AlbumCommentRow);
}

export async function hideAlbumComment(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("album_comments").update({ is_hidden: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteAlbumComment(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("album_comments").delete().eq("id", id);
  if (error) throw error;
}
