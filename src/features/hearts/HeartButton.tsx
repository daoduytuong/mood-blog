"use client";

import { useHeart } from "./useHeart";
import { HeartIcon } from "@/components/ui/HeartIcon";

// Tim lặng cho Người xem: KHÔNG hiện số; một chạm để thả/gỡ; fade ấm (không "bụp").
export function HeartButton({ postId }: { postId: string }) {
  const { liked, toggle } = useHeart(postId);

  return (
    <button
      type="button"
      onClick={(e) => {
        // Trong thẻ Feed có stretched-link phủ lên: chặn nổi bọt để không điều hướng.
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={liked ? "Gỡ tim" : "Thả tim cho bài này"}
      aria-pressed={liked}
      className="rounded-full p-2 text-accent transition-colors hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <HeartIcon
        size={22}
        fillOpacity={liked ? 0.9 : 0}
        className="transition-[fill-opacity] duration-300 ease-out"
      />
    </button>
  );
}
