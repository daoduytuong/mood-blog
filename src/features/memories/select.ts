import type { Post } from "@/lib/db/posts";
import { vnDateOf, vnToday } from "@/lib/date";

export interface Memory {
  post: Post;
  /** Số năm đã qua (>=1). */
  yearsAgo: number;
}

/**
 * "Ngày này năm xưa": các bài đăng cùng ngày-tháng (giờ VN) của những NĂM TRƯỚC.
 *
 * Không cần migration/query riêng: `/me` đã nạp toàn bộ bài của tác giả, nên chỉ
 * lọc trong bộ nhớ — đúng tinh thần $0 và không thêm round-trip DB.
 *
 * Xa nhất trước (kỷ niệm lâu nhất đứng đầu), rồi mới nhất trong cùng năm.
 */
export function selectMemories(posts: Post[], limit = 4): Memory[] {
  const today = vnToday();

  return posts
    .flatMap((post) => {
      const d = vnDateOf(post.createdAt);
      if (!d) return [];
      if (d.month !== today.month || d.day !== today.day) return [];
      const yearsAgo = today.year - d.year;
      if (yearsAgo < 1) return []; // bài của chính hôm nay không phải kỷ niệm
      return [{ post, yearsAgo }];
    })
    .sort(
      (a, b) =>
        b.yearsAgo - a.yearsAgo ||
        b.post.createdAt.localeCompare(a.post.createdAt),
    )
    .slice(0, limit);
}
