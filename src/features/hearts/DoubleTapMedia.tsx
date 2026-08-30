"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHeart } from "./useHeart";
import { HeartIcon } from "@/components/ui/HeartIcon";

const DOUBLE_TAP_MS = 280;
const OVERLAY_MS = 700;

// Bọc media trong feed: nằm TRÊN stretched-link (relative z-10) và tự xử lý chạm.
// - Chạm 1 lần: chờ DOUBLE_TAP_MS; không có chạm 2 -> điều hướng href (hoặc onSingleTap).
// - Chạm 2 lần (double-tap): CHỈ THẢ tim (không bao giờ gỡ — semantics IG) + overlay tim.
// Overlay: motion-safe dùng keyframe heartPop; motion-reduce hiện tĩnh rồi tự ẩn.
export function DoubleTapMedia({
  postId,
  href,
  onSingleTap,
  label,
  children,
}: {
  postId: string;
  href?: string;
  onSingleTap?: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { liked, toggle } = useHeart(postId);

  const lastTap = useRef(0);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    },
    [],
  );

  function navigate() {
    if (onSingleTap) onSingleTap();
    else if (href) router.push(href);
  }

  function likeOnly() {
    // `liked` tươi tại thời điểm click (handler tạo lại mỗi render).
    if (!liked) toggle();
    setOverlay(true);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setOverlay(false), OVERLAY_MS);
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      // Chạm thứ 2: huỷ điều hướng đang chờ, chỉ thả tim.
      lastTap.current = 0;
      if (navTimer.current) {
        clearTimeout(navTimer.current);
        navTimer.current = null;
      }
      likeOnly();
      return;
    }
    lastTap.current = now;
    navTimer.current = setTimeout(() => {
      navTimer.current = null;
      navigate();
    }, DOUBLE_TAP_MS);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate();
    }
  }

  const interactive = !!href || !!onSingleTap;

  return (
    <div
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={interactive ? onKeyDown : undefined}
      className="relative z-10 cursor-pointer touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      {children}
      {overlay && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <HeartIcon
            size={72}
            fillOpacity={1}
            className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] motion-safe:animate-[heartPop_700ms_ease-out] motion-reduce:opacity-80"
          />
        </span>
      )}
    </div>
  );
}
