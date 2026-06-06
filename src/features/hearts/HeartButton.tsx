"use client";

import { useHeart } from "./useHeart";
import { HeartIcon } from "@/components/ui/HeartIcon";

// Tim lặng cho Người xem: KHÔNG hiện số; một chạm để thả/gỡ; fade ấm (không "bụp").
// `label` (tuỳ chọn): mô tả bài để aria-label không trùng nhau giữa các thẻ Feed.
export function HeartButton({ postId, label }: { postId: string; label?: string }) {
  const { liked, toggle } = useHeart(postId);
  const what = label ? `: ${label}` : " cho bài này";

  return (
    <button
      type="button"
      onClick={(e) => {
        // Trong thẻ Feed có stretched-link phủ lên: chặn nổi bọt để không điều hướng.
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={liked ? `Gỡ tim${what}` : `Thả tim${what}`}
      aria-pressed={liked}
      className="grid min-h-11 min-w-11 place-items-center rounded-full p-2.5 text-accent transition-colors hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <HeartIcon
        size={22}
        fillOpacity={liked ? 0.9 : 0}
        className="transition-[fill-opacity] duration-300 ease-out motion-reduce:transition-none"
      />
    </button>
  );
}
