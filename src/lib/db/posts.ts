import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostRow, PostType, MediaItem } from "@/lib/db/types";
import type { MoodCode } from "@/lib/moods";

// Client không-generic; lib/db tự map kiểu (cast Row khi đọc).
type DB = SupabaseClient;

// Domain type (camelCase) — ranh giới map snake_case (DB) <-> camelCase (TS).
export interface Post {
  id: string;
  authorId: string;
  type: PostType;
  mood: MoodCode;
  caption: string | null;
  excerpt: string | null;
  linkUrl: string | null;
  media: MediaItem[];
  slug: string;
  isPublished: boolean;
  createdAt: string;
}

function toPost(r: PostRow): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    type: r.type,
    mood: r.mood,
    caption: r.caption,
    excerpt: r.excerpt,
    linkUrl: r.link_url,
    media: r.media ?? [],
    slug: r.slug,
    isPublished: r.is_published,
    createdAt: r.created_at,
  };
}

export interface NewPost {
  authorId: string;
  type: PostType;
  mood: MoodCode;
  slug: string;
  caption?: string | null;
  excerpt?: string | null;
  linkUrl?: string | null;
  media?: MediaItem[];
}

/** Feed công khai: mới nhất trước, tie-break ổn định theo id. Defensive: lỗi -> []. */
export async function listPublished(sb: DB): Promise<Post[]> {
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error || !data) return [];
  return data.map(toPost);
}

/** Mọi bài của Tác giả (cho /me). RLS posts_author_all cho phép. Defensive: lỗi -> []. */
export async function listByAuthor(sb: DB, authorId: string): Promise<Post[]> {
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toPost);
}

/** Slug -> Post (hoặc null nếu không có / chưa publish). */
export async function getBySlug(sb: DB, slug: string): Promise<Post | null> {
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  return toPost(data);
}

/** Mọi slug đã publish (cho generateStaticParams). */
export async function listSlugs(sb: DB): Promise<string[]> {
  const { data, error } = await sb
    .from("posts")
    .select("slug")
    .eq("is_published", true);
  if (error || !data) return [];
  return data.map((r) => r.slug);
}

/** Đếm bài (head:true -> không trả rows) — query THẬT nhẹ cho keepalive (Story 1.8). */
export async function countPosts(sb: DB): Promise<number> {
  const { count, error } = await sb
    .from("posts")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Tác giả tạo bài (RLS posts_author_all kiểm auth.uid() = author_id). */
export async function createPost(sb: DB, input: NewPost): Promise<Post> {
  const { data, error } = await sb
    .from("posts")
    .insert({
      author_id: input.authorId,
      type: input.type,
      mood: input.mood,
      slug: input.slug,
      caption: input.caption ?? null,
      excerpt: input.excerpt ?? null,
      link_url: input.linkUrl ?? null,
      media: input.media ?? [],
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createPost failed");
  return toPost(data);
}

/** Tác giả sửa bài (KHÔNG đổi slug — giữ OG/sitemap). */
export async function updatePost(
  sb: DB,
  id: string,
  patch: Partial<Pick<Post, "caption" | "excerpt" | "linkUrl" | "media" | "mood">>,
): Promise<void> {
  const { error } = await sb
    .from("posts")
    .update({
      caption: patch.caption,
      excerpt: patch.excerpt,
      link_url: patch.linkUrl,
      media: patch.media,
      mood: patch.mood,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Tác giả xoá bài (hearts cascade theo FK). */
export async function deletePost(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("posts").delete().eq("id", id);
  if (error) throw error;
}
