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

// SWR: nạp lại TRANG ĐẦU để làm tươi feed. Client hiện cache localStorage ngay,
// rồi gọi cái này nền; chỉ thay khi user đang ở đầu feed (không "chen" giữa lúc đọc).
export async function getFreshFeed(limit = 10): Promise<Post[]> {
  return getFeedPage(limit);
}
