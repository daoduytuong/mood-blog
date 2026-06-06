import { createPublicClient } from "@/lib/supabase/public";
import {
  listPublished,
  listPublishedPage,
  type Post,
  type FeedCursor,
} from "@/lib/db/posts";

// Lấy Feed công khai (client không-cookie -> giữ ISR). Defensive: lỗi -> [].
export async function getFeedPosts(): Promise<Post[]> {
  return listPublished(createPublicClient());
}

// Một trang Feed (keyset). Dùng cho SSR trang đầu + "Xem thêm".
export async function getFeedPage(
  limit: number,
  cursor?: FeedCursor,
): Promise<Post[]> {
  return listPublishedPage(createPublicClient(), limit, cursor);
}
