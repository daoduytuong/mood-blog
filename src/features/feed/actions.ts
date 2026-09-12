"use server";

import { getFeedPage } from "./queries";
import type { Post, FeedCursor } from "@/lib/db/posts";
import type { MoodCode } from "@/lib/moods";

// "Xem thêm" — nạp trang Feed kế tiếp (đọc công khai, không cookies).
// `mood` PHẢI được truyền lại từ trang lọc, nếu không "Xem thêm" sẽ nối bài
// của tâm trạng khác vào danh sách đang lọc.
export async function loadMorePosts(
  cursor: FeedCursor,
  limit = 10,
  mood?: MoodCode,
): Promise<Post[]> {
  return getFeedPage(limit, cursor, mood);
}

// SWR: nạp lại TRANG ĐẦU để làm tươi feed. Client hiện cache localStorage ngay,
// rồi gọi cái này nền; chỉ thay khi user đang ở đầu feed (không "chen" giữa lúc đọc).
export async function getFreshFeed(
  limit = 10,
  mood?: MoodCode,
): Promise<Post[]> {
  return getFeedPage(limit, undefined, mood);
}
