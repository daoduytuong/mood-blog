import { Chip, MoodChip } from "@/components/ui/Chip";
import { MOOD_CODES, moodPath, type MoodCode } from "@/lib/moods";

/**
 * Hàng lọc theo tâm trạng ở đầu Feed. Là LINK (không phải state client) nên mỗi
 * bộ lọc có URL chia sẻ được và trang vẫn tĩnh/ISR — không biến `/` thành dynamic.
 *
 * Cuộn ngang trên mobile: 7 chip không vừa 1 hàng, mà xuống dòng thì đội mất
 * chiều cao của phần đầu feed. Thanh cuộn ẩn đi cho gọn (vẫn vuốt được).
 */
export function MoodFilterChips({ active }: { active?: MoodCode }) {
  return (
    <nav
      aria-label="Lọc theo tâm trạng"
      className="-mx-4.5 mb-4 overflow-x-auto px-4.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max items-center gap-2">
        <li>
          <Chip label="Tất cả" href="/" selected={!active} size="sm" />
        </li>
        {MOOD_CODES.map((code) => (
          <li key={code}>
            <MoodChip
              code={code}
              href={moodPath(code)}
              selected={active === code}
              size="sm"
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
