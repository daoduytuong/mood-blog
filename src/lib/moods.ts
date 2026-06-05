/**
 * Nguồn chân lý DUY NHẤT cho 6 tâm trạng.
 * - `label`: tên hiển thị tiếng Việt.
 * - `tokenVar`: biến CSS màu (định nghĩa trong globals.css `@theme`).
 * Bất biến: KHÔNG hardcode mã màu hex của tâm trạng ở bất kỳ đâu khác — luôn qua đây.
 * `mood_code` (enum) ở DB (Story 1.3) phải khớp đúng 6 khoá dưới.
 */
export const MOODS = {
  hoai_niem: { label: "hoài niệm", tokenVar: "--color-mood-hoai-niem" },
  binh_yen: { label: "bình yên", tokenVar: "--color-mood-binh-yen" },
  vui: { label: "vui", tokenVar: "--color-mood-vui" },
  buon: { label: "buồn", tokenVar: "--color-mood-buon" },
  tram_tu: { label: "trầm tư", tokenVar: "--color-mood-tram-tu" },
  co_don: { label: "cô đơn", tokenVar: "--color-mood-co-don" },
} as const;

export type MoodCode = keyof typeof MOODS;

/** Danh sách mã tâm trạng theo thứ tự hiển thị (vd bộ chọn ở Soạn bài). */
export const MOOD_CODES = Object.keys(MOODS) as MoodCode[];

/** Lấy màu CSS của một tâm trạng để dùng inline (vd thanh màu, chấm). */
export function moodColor(code: MoodCode): string {
  return `var(${MOODS[code].tokenVar})`;
}
