"use client";

import { useEffect, useState } from "react";

// Đổi sáng/tối. FOUC đã chống bằng inline script ở layout (đặt class .dark trước paint).
// Render initial `dark=false` (khớp SSR) rồi đồng bộ sau mount -> không hydration mismatch.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ class .dark (do inline script đặt trước paint), tránh hydration mismatch
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Chuyển nền sáng" : "Chuyển nền tối"}
      className="grid h-9 w-9 place-items-center rounded-full border border-border text-text transition-colors hover:border-accent hover:text-accent-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// SVG nội tuyến thay glyph unicode ☀/☾: glyph render lệch nét/lệch cỡ theo
// hệ điều hành (và có máy vẽ thành emoji màu), trong khi icon còn lại của web
// đều là SVG nét 1.5px theo currentColor.
function SunIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 14.4A8.5 8.5 0 1 1 9.6 4a6.8 6.8 0 0 0 10.4 10.4Z" />
    </svg>
  );
}
