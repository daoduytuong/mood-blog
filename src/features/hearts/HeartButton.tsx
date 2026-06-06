"use client";

import { useHeart } from "./useHeart";

// Tim lặng cho Người xem: KHÔNG hiện số; một chạm để thả; fade ấm (không "bụp").
export function HeartButton({ postId }: { postId: string }) {
  const { liked, like } = useHeart(postId);

  return (
    <button
      type="button"
      onClick={(e) => {
        // Trong thẻ Feed có stretched-link phủ lên: chặn nổi bọt để không điều hướng.
        e.preventDefault();
        e.stopPropagation();
        like();
      }}
      aria-label="Thả tim cho bài này"
      aria-pressed={liked}
      className="rounded-full p-2 text-accent transition-colors hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        className="transition-[fill-opacity] duration-300 ease-out"
        fillOpacity={liked ? 0.2 : 0}
      >
        <path d="M12 20s-7-4.4-9.2-8.4C1.3 8.4 3 5.5 6 5.5c1.8 0 3 1 4 2.3 1-1.3 2.2-2.3 4-2.3 3 0 4.7 2.9 3.2 6.1C19 15.6 12 20 12 20Z" />
      </svg>
    </button>
  );
}
