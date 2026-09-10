import { createPublicClient } from "@/lib/supabase/public";
import {
  listPublished,
  listPublishedPage,
  type Post,
  type FeedCursor,
} from "@/lib/db/posts";
import type { MoodCode } from "@/lib/moods";

// Lấy Feed công khai (client không-cookie -> giữ ISR). Defensive: lỗi -> [].
export async function getFeedPosts(): Promise<Post[]> {
  return listPublished(createPublicClient());
}

// Một trang Feed (keyset). Dùng cho SSR trang đầu + "Xem thêm".
// `mood` có mặt -> trang lọc /tam-trang/<slug>; bỏ trống -> feed đầy đủ.
export async function getFeedPage(
  limit: number,
  cursor?: FeedCursor,
  mood?: MoodCode,
): Promise<Post[]> {
  return listPublishedPage(createPublicClient(), limit, cursor, mood);
}
