"use client";

import { useEffect, useRef, useState } from "react";
import { ImageBlur } from "./ImageBlur";

// Xem ảnh lớn: chạm ảnh -> overlay full-screen (fade tĩnh, Esc/× đóng, khóa cuộn).
// Chỉ ảnh. KHÔNG pinch-zoom, KHÔNG double-tap-like.
export function Lightbox({
  src,
  alt,
  sizes,
  blurDataURL,
  ratio,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  blurDataURL?: string;
  ratio?: number;
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // khóa cuộn nền
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Xem ảnh lớn"
        className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <ImageBlur
          src={src}
          alt={alt}
          sizes={sizes}
          blurDataURL={blurDataURL}
          ratio={ratio}
          priority={priority}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh phóng to"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/80 p-4 backdrop-blur-sm motion-safe:animate-[fadeIn_180ms_ease-out]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh full-res, không cần next/image trong overlay */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-md object-contain shadow-soft"
          />
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-surface/85 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
