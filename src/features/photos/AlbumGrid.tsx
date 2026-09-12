"use client";

import { useEffect, useState } from "react";
import type { Album } from "@/lib/db/albums";
import { AlbumCard } from "./AlbumCard";

type View = "grid" | "editorial";
const KEY = "mb_photo_view";

/**
 * Hai chế độ xem cho /anh. Mode là state CLIENT (không ?view= — query param
 * đẩy trang sang dynamic). CSS đọc `data-view` trên <html> (inline script ở
 * layout đặt trước paint) nên bố cục đúng ngay lần vẽ đầu; React quyết định có
 * render ảnh xem trước hay không (không tải thừa). Mặc định: lưới.
 */
export function AlbumGrid({ albums }: { albums: Album[] }) {
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ data-view (inline script đặt trước paint), tránh hydration mismatch
    setView(document.documentElement.dataset.view === "editorial" ? "editorial" : "grid");
  }, []);

  function choose(v: View) {
    setView(v);
    if (v === "editorial") document.documentElement.setAttribute("data-view", "editorial");
    else document.documentElement.removeAttribute("data-view");
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  }

  const btn = (v: View, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={view === v}
      aria-label={label}
      onClick={() => choose(v)}
      className={`grid h-9 w-9 place-items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        view === v ? "border-accent text-accent-text" : "border-border text-text-muted hover:border-accent hover:text-text"
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        {btn("grid", "Xem dạng lưới", <GridIcon />)}
        {btn("editorial", "Xem dạng bài viết", <ListIcon />)}
      </div>
      {/* CSS: html[data-view=editorial] .album-list -> 1 cột; mặc định 3 cột (globals.css, Step 4). */}
      <ul className="album-list grid grid-cols-3 gap-2">
        {albums.map((a, i) => (
          <li key={a.id}>
            <AlbumCard
              album={a}
              mode={view}
              sizes={view === "grid" ? "(max-width: 600px) 33vw, 200px" : "(max-width: 600px) 100vw, 600px"}
              priority={i < 3}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
