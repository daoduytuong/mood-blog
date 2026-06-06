"use client";

import { useState } from "react";

// Vimeo: poster tĩnh, CHẠM MỚI PHÁT (không autoplay khi tải), player ẩn chrome.
export function VideoEmbed({
  videoId,
  poster,
  caption,
}: {
  videoId: string;
  poster?: string;
  caption?: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full bg-background">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={caption ?? "Video"}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
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
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/85 text-text shadow-[0_4px_20px_rgba(62,74,83,0.12)] transition-transform group-hover:scale-105">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
