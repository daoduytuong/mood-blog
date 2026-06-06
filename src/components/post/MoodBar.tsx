import { MOODS, type MoodCode } from "@/lib/moods";

// Thanh màu tâm trạng mảnh dọc mép trái thẻ (đặt trong phần tử `relative`).
export function MoodBar({ mood }: { mood: MoodCode }) {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-0 bottom-0 w-1"
      style={{ background: `var(${MOODS[mood].tokenVar})` }}
    />
  );
}

// Nhãn tâm trạng: chấm màu + TÊN CHỮ ("màu là hơi thở, chữ là tên gọi").
export function MoodLabel({ mood }: { mood: MoodCode }) {
  const { label, tokenVar } = MOODS[mood];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: `var(${tokenVar})` }}
      />
      {label}
    </span>
  );
}
