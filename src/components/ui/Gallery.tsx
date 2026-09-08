"use client";

import { useEffect, useRef, useState } from "react";

// Carousel nhiều ảnh — vuốt tay (scroll-snap gốc) + chấm chỉ số + đếm "1/N".
// KHÔNG auto-advance (đúng luật "không auto-motion"); cuộn/đổi ảnh là chủ động.
// Tôn trọng prefers-reduced-motion (bỏ smooth-scroll). 1 slide -> trả thẳng, không chrome.
//
// Hai hành vi theo thiết bị (phân biệt bằng capability query `desktop:`, KHÔNG sniff UA):
// - Desktop (chuột/trackpad): thêm nút ‹ › kiểu IG, ẩn ở hai đầu.
// - Mobile/touch: vẫn vuốt như cũ, nhưng `snap-always` chặn fling bay qua nhiều ảnh.
export function Gallery({
  ariaLabel = "Bộ ảnh",
  children,
}: {
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const slides = Array.isArray(children) ? children : [children];
  const n = slides.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Đồng bộ chấm/đếm theo vị trí cuộn. scroll bắn rất dày -> gộp về 1 lần/frame.
  function onScroll() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = trackRef.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex((prev) => (prev === i ? prev : i));
    });
  }

  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(i, n - 1));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  // Một slide: không cần carousel.
  if (n <= 1) return <>{slides}</>;

  // Nút ‹ › — chỉ hiện trên desktop; ẩn (giữ chỗ) ở hai đầu như IG, không chuyển động.
  const arrow =
    "absolute top-1/2 z-20 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-text shadow-soft ring-1 ring-border/60 backdrop-blur-sm hover:bg-surface hover:ring-border disabled:invisible desktop:grid";

  return (
    <div
      className="relative"
      role="group"
      aria-roledescription="bộ ảnh"
      aria-label={`${ariaLabel} — ${n} ảnh`}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKey}
        tabIndex={0}
        className="flex snap-x snap-mandatory items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          // snap-always = scroll-snap-stop: always -> một cú vuốt chỉ qua ĐÚNG 1 ảnh,
          // fling mượt trên iOS/Android không còn "vuột" mất ảnh giữa.
          <div key={i} className="w-full shrink-0 snap-center snap-always">
            {slide}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        aria-label="Ảnh trước"
        className={`${arrow} left-2`}
      >
        <ChevronIcon dir="left" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        disabled={index === n - 1}
        aria-label="Ảnh sau"
        className={`${arrow} right-2`}
      >
        <ChevronIcon dir="right" />
      </button>

      {/* Đếm "1/N" — pill kín đáo góc trên-phải */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 top-2 rounded-full bg-surface/85 px-2 py-0.5 text-[11px] tabular-nums text-text shadow-soft backdrop-blur-sm"
      >
        {index + 1}/{n}
      </div>

      {/* Chấm chỉ số — bấm để nhảy ảnh. Nhiều slide (hành trình dài) -> ẩn chấm, pill 1/N là đủ. */}
      {n <= 10 && (
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-4 bg-accent"
                  : "w-1.5 bg-surface/70 ring-1 ring-border/50 hover:bg-surface"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === "left" ? "M14.5 5 8 12l6.5 7" : "M9.5 5 16 12l-6.5 7"} />
    </svg>
  );
}
