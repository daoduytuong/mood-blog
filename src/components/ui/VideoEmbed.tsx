"use client";

import { useEffect, useRef, useState } from "react";

const PARAMS = "title=0&byline=0&portrait=0&dnt=1";

// Vimeo player nhận lệnh qua postMessage (player.js dưới nền) — đổi tiếng KHÔNG reload.
function sendVimeo(win: Window, method: string, value: unknown) {
  win.postMessage(JSON.stringify({ method, value }), "https://player.vimeo.com");
}

// Detail: autoPlay -> phát ngay nhưng MUTED (chính sách trình duyệt) + nút bật tiếng.
// Mặc định (feed/khác): poster tĩnh, CHẠM MỚI PHÁT (có tiếng luôn vì là user gesture).
// Tôn trọng prefers-reduced-motion: không autoplay, quay về chạm-mới-phát.
export function VideoEmbed({
  videoId,
  poster,
  caption,
  autoPlay = false,
}: {
  videoId: string;
  poster?: string;
  caption?: string;
  autoPlay?: boolean;
}) {
  // null = poster (chạm-mới-phát). { muted } = đang phát; muted cố định -> src ổn định,
  // đổi tiếng qua postMessage KHÔNG làm iframe tải lại.
  const [started, setStarted] = useState<{ muted: boolean } | null>(null);
  const [unmuted, setUnmuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Bắt đầu từ poster ở cả SSR lẫn client (tránh hydration mismatch); sau mount mới
  // quyết định autoplay ở client để đọc được prefers-reduced-motion.
  useEffect(() => {
    if (!autoPlay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chỉ biết được ở client sau mount
    setStarted({ muted: true });
  }, [autoPlay]);

  const playing = started !== null;
  const startMuted = started?.muted ?? false;
  const showUnmute = !!started?.muted && !unmuted;

  function play() {
    setStarted({ muted: false }); // user gesture -> có tiếng luôn
  }

  function unmute() {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      sendVimeo(win, "setMuted", false);
      sendVimeo(win, "setVolume", 1);
    }
    setUnmuted(true);
  }

  if (playing) {
    return (
      <div className="relative aspect-video w-full bg-background">
        <iframe
          ref={iframeRef}
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=${startMuted ? 1 : 0}&${PARAMS}`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={caption ?? "Video"}
        />
        {showUnmute && (
          <button
            type="button"
            onClick={unmute}
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs text-text shadow-[0_4px_20px_rgba(62,74,83,0.12)] transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
            Bật tiếng
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label="Phát video"
      className="group relative block aspect-video w-full overflow-hidden bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- poster Vimeo ngoài; không cần next/image
        <img
          src={poster}
          alt={caption ?? ""}
          className="h-full w-full object-cover"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/85 text-text shadow-[0_4px_20px_rgba(62,74,83,0.12)]">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
