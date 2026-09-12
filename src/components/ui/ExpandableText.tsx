"use client";

import { useEffect, useRef, useState } from "react";

// Caption/đoạn dài: thu gọn (line-clamp) + nút "Xem thêm" để mở tại chỗ (không rời feed).
// Chỉ hiện nút khi văn bản THỰC SỰ tràn (đo scrollHeight vs clientHeight sau mount).
// Nút nâng z-10 + pointer-events-auto để nổi trên stretched-link của PostCard.
export function ExpandableText({
  text,
  clampClass,
  className = "",
  as = "p",
}: {
  text: string;
  clampClass: string; // vd "line-clamp-3"
  className?: string;
  as?: "p" | "blockquote";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  const cls = `${expanded ? "" : clampClass} ${className}`;
  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
  };

  return (
    <div>
      {as === "blockquote" ? (
        <blockquote ref={setRef} className={cls}>
          {text}
        </blockquote>
      ) : (
        <p ref={setRef} className={cls}>
          {text}
        </p>
      )}
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="pointer-events-auto relative z-10 mt-0.5 text-xs text-text-muted transition-colors hover:text-accent-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
