"use client";

import { useRef, useState } from "react";

// Carousel nhiều ảnh — vuốt tay (scroll-snap gốc) + chấm chỉ số + đếm "1/N".
// KHÔNG auto-advance (đúng luật "không auto-motion"); cuộn/đổi ảnh là chủ động.
// Tôn trọng prefers-reduced-motion (bỏ smooth-scroll). 1 slide -> trả thẳng, không chrome.
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
  const [index, setIndex] = useState(0);

  // Đồng bộ chấm/đếm theo vị trí cuộn (không setState-trong-render).
  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  }

  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(Math.min(index + 1, n - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(Math.max(index - 1, 0));
    }
  }

  // Một slide: không cần carousel.
  if (n <= 1) return <>{slides}</>;

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
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {slide}
          </div>
        ))}
      </div>

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
                i === index ? "w-4 bg-accent" : "w-1.5 bg-surface/80 hover:bg-surface"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
