"use server";

import { getFeedPage } from "./queries";
import type { Post, FeedCursor } from "@/lib/db/posts";

// "Xem thêm" — nạp trang Feed kế tiếp (đọc công khai, không cookies).
export async function loadMorePosts(
  cursor: FeedCursor,
  limit = 10,
): Promise<Post[]> {
  return getFeedPage(limit, cursor);
}
