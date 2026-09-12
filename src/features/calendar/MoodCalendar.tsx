import Link from "next/link";
import { MOODS, MOOD_CODES, moodColor } from "@/lib/moods";
import type { CalendarMonth } from "./group";

// Tuần bắt đầu Thứ Hai (nếp Việt). Nhãn ngắn để 7 cột vừa cột 600px.
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const MONTH_FMT = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const DAY_FMT = new Intl.DateTimeFormat("vi-VN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

// Giữa trưa UTC: đủ xa hai mốc nửa đêm nên đổi sang giờ VN không rơi sang ngày khác.
function monthLabel(year: number, month: number) {
  return MONTH_FMT.format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function dayLabel(iso: string) {
  return DAY_FMT.format(new Date(`${iso}T12:00:00Z`));
}

/**
 * Lịch cảm xúc — mỗi ô là một NGÀY, nhuốm màu tâm trạng của bài đầu tiên ngày đó.
 *
 * Ranh giới bất biến: "KHÔNG nhuốm mood lên nền thẻ/nội dung" vẫn giữ nguyên —
 * ô lịch không chứa nội dung bài, nó LÀ dữ liệu (data-viz), nên được phép mang
 * màu. Đổi lại, màu không bao giờ đứng một mình: có chú giải màu+chữ ở trên,
 * và mỗi ô có bài mang nhãn chữ đầy đủ cho trình đọc màn hình.
 *
 * KHÔNG dùng role="grid": vai đó đòi điều hướng bằng phím mũi tên. Ở đây chỉ
 * ngày CÓ bài là link nên Tab đi đúng những gì bấm được, không có 30 điểm dừng
 * rỗng — đơn giản mà đúng hơn một cái grid nửa vời.
 *
 * KHÔNG chuỗi ngày, KHÔNG đếm "đã bỏ lỡ", KHÔNG % tăng trưởng.
 */
export function MoodCalendar({ months }: { months: CalendarMonth[] }) {
  return (
    <div className="flex flex-col gap-10">
      {/* Chú giải: màu đi kèm chữ (3 mood tông xanh-xám rất dễ lẫn). */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-muted">
        {MOOD_CODES.map((code) => (
          <li key={code} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: moodColor(code) }}
            />
            {MOODS[code].label}
          </li>
        ))}
      </ul>

      {months.map((m) => (
        <section key={`${m.year}-${m.month}`}>
          <h2 className="mb-3 font-serif text-base font-medium text-text">
            {monthLabel(m.year, m.month)}
          </h2>

          {/* Hàng thứ chỉ là mốc thị giác — mỗi ô đã tự đọc đủ ngày/tháng/năm. */}
          <div aria-hidden className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] text-text-muted">
                {w}
              </div>
            ))}
          </div>

          <ul className="grid grid-cols-7 gap-1">
            {Array.from({ length: m.leading }).map((_, i) => (
              <li key={`pad-${i}`} aria-hidden />
            ))}

            {Array.from({ length: m.daysInMonth }, (_, i) => i + 1).map(
              (day) => {
                const entry = m.byDay.get(day);

                if (!entry) {
                  return (
                    <li
                      key={day}
                      aria-hidden
                      className="grid aspect-square place-items-center rounded-sm border border-border/60 text-xs text-text-muted"
                    >
                      {day}
                    </li>
                  );
                }

                const label = `${dayLabel(entry.iso)}: ${MOODS[entry.mood].label}${
                  entry.count > 1 ? ` · ${entry.count} bài` : ""
                }`;

                return (
                  <li key={day}>
                    <Link
                      href={`/m/${entry.slug}`}
                      aria-label={label}
                      title={label}
                      className="relative grid aspect-square place-items-center rounded-sm border border-transparent text-xs text-text transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      style={{
                        background: `color-mix(in oklab, ${moodColor(entry.mood)} 22%, transparent)`,
                      }}
                    >
                      {day}
                      {entry.count > 1 && (
                        <span
                          aria-hidden
                          className="absolute bottom-1 h-1 w-1 rounded-full bg-text/50"
                        />
                      )}
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
