import type { MediaItem, PostType } from "@/lib/db/types";
import type { Post } from "@/lib/db/posts";

// Nhãn hiển thị (tiếng Việt) cho từng loại bài — dùng chung Feed/Detail//me.
export const POST_TYPE_LABEL: Record<PostType, string> = {
  khoanh_khac: "Khoảnh khắc",
  goc_doc: "Góc đọc",
  hanh_trinh: "Hành trình",
};

// Tiêu đề fallback khi bài không có caption/excerpt (OG title, /me, aria).
export const POST_TYPE_FALLBACK_TITLE: Record<PostType, string> = {
  khoanh_khac: "Một khoảnh khắc",
  goc_doc: "Một góc đọc",
  hanh_trinh: "Một hành trình",
};

/** Tiêu đề để hiển thị trong danh sách (/me, kỷ niệm) — có fallback theo loại. */
export function postTitle(post: Post): string {
  return post.caption || post.excerpt || POST_TYPE_FALLBACK_TITLE[post.type];
}

/**
 * Media đại diện cho ảnh nhỏ. Hành trình lấy chặng MỚI NHẤT (phần tử cuối) —
 * bài lớn dần, ảnh đầu tiên không còn nói lên hiện tại; loại khác lấy ảnh đầu.
 */
export function postThumb(post: Post): MediaItem | undefined {
  return post.type === "hanh_trinh"
    ? post.media[post.media.length - 1]
    : post.media[0];
}
