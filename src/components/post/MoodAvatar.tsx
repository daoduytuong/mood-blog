import { MOODS, type MoodCode } from "@/lib/moods";

// "Avatar" tâm trạng cho header card kiểu IG: đĩa tròn 32px nhuộm nhạt màu mood
// + chấm đặc ở giữa. Màu luôn qua token (KHÔNG hardcode hex).
export function MoodAvatar({ mood }: { mood: MoodCode }) {
  const { tokenVar } = MOODS[mood];
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border"
      style={{
        background: `color-mix(in oklab, var(${tokenVar}) 18%, var(--color-surface))`,
      }}
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{ background: `var(${tokenVar})` }}
      />
    </span>
  );
}
