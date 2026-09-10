import type { PostMoodStamp } from "@/lib/db/posts";
import { vnDateOf } from "@/lib/date";
import type { MoodCode } from "@/lib/moods";

export interface CalendarDay {
  day: number; // 1–31
  iso: string; // YYYY-MM-DD (giờ VN)
  mood: MoodCode; // màu của ô = tâm trạng bài ĐẦU TIÊN trong ngày
  slug: string; // ô dẫn tới đúng bài đã cho màu
  count: number; // số bài trong ngày (>1 -> hiện chấm "còn nữa")
}

export interface CalendarMonth {
  year: number;
  month: number; // 1–12
  /** Thứ của ngày 1 theo tuần bắt đầu THỨ HAI: 0 = T2 … 6 = CN. */
  leading: number;
  daysInMonth: number;
  /** Chỉ những ngày CÓ bài, tra theo số ngày. */
  byDay: Map<number, CalendarDay>;
}

/** Thứ (0=T2…6=CN) của một ngày dương lịch, tính thuần trên lịch — không lệch múi giờ. */
function weekdayMondayFirst(year: number, month: number, day: number): number {
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=CN
  return (dow + 6) % 7;
}

/**
 * Nhóm mốc bài theo tháng (giờ VN), MỚI NHẤT TRƯỚC.
 *
 * Chỉ trả tháng CÓ bài: chèn cả những tháng trống chỉ để "cho liền mạch" sẽ đẩy
 * trang dài ra mà không nói thêm điều gì.
 *
 * Ngày có nhiều bài -> lấy tâm trạng của bài ĐẦU TIÊN trong ngày (quyết định
 * 2026-09-08), kèm `count` để ô hiện dấu "còn nữa".
 */
export function groupByMonth(stamps: PostMoodStamp[]): CalendarMonth[] {
  const months = new Map<string, CalendarMonth>();
  // Bài sớm nhất trong ngày phải được xét trước để "đầu tiên" là sớm nhất.
  const ascending = [...stamps].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  for (const s of ascending) {
    const d = vnDateOf(s.createdAt);
    if (!d) continue;
    const key = `${d.year}-${d.month}`;
    let m = months.get(key);
    if (!m) {
      m = {
        year: d.year,
        month: d.month,
        leading: weekdayMondayFirst(d.year, d.month, 1),
        daysInMonth: new Date(Date.UTC(d.year, d.month, 0)).getUTCDate(),
        byDay: new Map(),
      };
      months.set(key, m);
    }
    const existing = m.byDay.get(d.day);
    if (existing) {
      existing.count += 1; // giữ mood/slug của bài đầu tiên
    } else {
      m.byDay.set(d.day, {
        day: d.day,
        iso: d.iso,
        mood: s.mood,
        slug: s.slug,
        count: 1,
      });
    }
  }

  return [...months.values()].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );
}
