import Link from "next/link";
import { MOODS, moodColor, type MoodCode } from "@/lib/moods";

/**
 * Chip bo tròn — 2 vai:
 * - `href` -> <Link> (chip LỌC: URL chia sẻ được, `aria-current` khi đang xem).
 * - không `href` -> <button aria-pressed> (chip CHỌN: bộ chọn tâm trạng).
 *
 * Bất biến: hover chỉ đổi màu/viền; chấm màu LUÔN kèm chữ ("màu là hơi thở,
 * chữ là tên gọi") — 3 mood tông xanh-xám dễ lẫn + an toàn mù màu.
 */
export type ChipSize = "sm" | "md";

const SIZE: Record<ChipSize, string> = {
  sm: "gap-1.5 px-2.5 py-1 text-xs",
  md: "gap-2 px-3 py-1.5 text-sm",
};

const DOT: Record<ChipSize, string> = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
};

interface ChipProps {
  label: string;
  /** Màu chấm (dùng `moodColor()`); bỏ trống -> chip không chấm, vd "Tất cả". */
  dotColor?: string;
  selected?: boolean;
  size?: ChipSize;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function Chip({
  label,
  dotColor,
  selected = false,
  size = "md",
  href,
  onClick,
  className = "",
}: ChipProps) {
  const cls = `inline-flex items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${SIZE[size]} ${
    selected
      ? "border-accent text-text"
      : "border-border text-text-muted hover:text-text"
  } ${className}`;

  const inner = (
    <>
      {dotColor && (
        <span
          aria-hidden
          className={`${DOT[size]} shrink-0 rounded-full`}
          style={{ background: dotColor }}
        />
      )}
      {label}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={cls}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cls}>
      {inner}
    </button>
  );
}

/** Chip tâm trạng — nhãn + màu lấy từ `src/lib/moods.ts` (chân lý duy nhất). */
export function MoodChip({
  code,
  ...rest
}: { code: MoodCode } & Omit<ChipProps, "label" | "dotColor">) {
  return <Chip {...rest} label={MOODS[code].label} dotColor={moodColor(code)} />;
}
