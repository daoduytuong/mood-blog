"use client";

import { useState } from "react";

// Chia sẻ cho MỌI người xem: navigator.share (mobile) / fallback chép link + báo dịu.
// KHÔNG share-to-story, KHÔNG đếm share. URL = canonical /m/[slug].
export function ShareButton({ slug, title }: { slug: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = `${window.location.origin}/m/${slug}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: title ?? "khoảnh khắc của tôi", url });
      } catch {
        /* người dùng huỷ -> bỏ qua */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard không khả dụng -> bỏ qua */
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Chia sẻ bài này"
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-text-muted transition-colors hover:bg-accent/5 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? "Đã chép link" : "Chia sẻ"}
    </button>
  );
}
