import type { PostType } from "@/lib/db/types";

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
